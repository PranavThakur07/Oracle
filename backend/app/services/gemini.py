import httpx
import json
import logging
from typing import Dict, Any, List
from app.config import GEMINI_API_KEY
from app.services.provider import AIProvider
from app.schemas.schemas import SimulationResponse, FollowUpResponse

logger = logging.getLogger("oracle_gemini")

def dereference_schema(schema: dict) -> dict:
    """
    Resolves and inlines all Pydantic $defs/$ref definitions because Gemini
    does not support external references in response_schema.
    Also strips out unsupported OpenAPI keys like 'additionalProperties', 'title', and 'default'.
    """
    defs = schema.get("$defs", {})
    
    def resolve(node, key_context=None):
        if isinstance(node, dict):
            if "$ref" in node:
                ref_path = node["$ref"]
                def_name = ref_path.split("/")[-1]
                return resolve(defs[def_name], key_context)
            
            new_dict = {}
            for k, v in node.items():
                if key_context == "properties":
                    # Keep all user-defined properties (like 'title' or 'default')
                    new_dict[k] = resolve(v)
                else:
                    if k in ["title", "default", "additionalProperties"]:
                        continue
                    new_dict[k] = resolve(v, k)
            return new_dict
        elif isinstance(node, list):
            return [resolve(x, key_context) for x in node]
        return node

    resolved = resolve(schema)
    if "$defs" in resolved:
        del resolved["$defs"]
    return resolved

class GeminiProvider(AIProvider):
    def __init__(self):
        if not GEMINI_API_KEY:
            logger.warning("GEMINI_API_KEY is not configured on the backend server.")

    async def generate_simulation(self, query: str, context: dict) -> Dict[str, Any]:
        """
        Calls Gemini 2.5 Flash to generate a structured decision simulation.
        """
        if not GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not configured. Please set it in your environment.")

        # Construct prompt
        prompt = (
            f"Perform a comprehensive decision simulation for the following query:\n"
            f"Query: \"{query}\"\n\n"
            f"User Context Details:\n"
            f"- Age: {context.get('age')}\n"
            f"- Current Salary/Income: {context.get('current_salary')}\n"
            f"- Financial Budget/Investment Limit: {context.get('budget')}\n"
            f"- Country/Location: {context.get('country')}\n"
            f"- Career/Life Goals: {context.get('career_goals')}\n"
            f"- Risk Appetite: {context.get('risk_appetite')}\n"
            f"- Time Horizon: {context.get('time_horizon')}\n\n"
            f"Requirements:\n"
            f"1. Generate between 2 to 4 realistic scenarios (default to 3, but let the context dictate the number). "
            f"For instance, for career choices, common paths might be: A) Status Quo (continue current job/studies), B) Primary pivot/advanced study, C) Alternative entrepreneurial path.\n"
            f"2. For each scenario, outline a chronological timeline of milestones with reasonable target years (e.g. 2026, 2027, 2030), concrete pros and cons, risks, estimated costs, expected benefits, opportunity cost (what is sacrificed), and confidence level (1-100).\n"
            f"3. Do NOT recommend one correct decision. Oracle is a neutral Decision Intelligence Platform. Help the user evaluate tradeoffs.\n"
            f"4. Document key starting assumptions and include a prominent warning disclaimer."
        )

        system_instruction = (
            "You are ORACLE, a premium AI-powered Decision Intelligence Platform.\n"
            "Your objective is to model multiple plausible scenarios for a user's key life choices.\n"
            "Remain completely objective, analytical, and professional. Use tone guidelines inspired by Stripe, Apple, and Linear.\n"
            "Do NOT state that one option is correct. Instead, map the options to the user's priorities (e.g., 'Highest salary', 'Lowest risk').\n"
            "You must return a single JSON object strictly matching the provided schema, with no markdown code blocks or wrapper text."
        )

        # Resolve Pydantic schema for Gemini responseSchema
        raw_schema = SimulationResponse.model_json_schema()
        clean_schema = dereference_schema(raw_schema)

        # Request to Gemini
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "systemInstruction": {
                "parts": [{"text": system_instruction}]
            },
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": clean_schema,
                "temperature": 0.3
            }
        }

        headers = {"Content-Type": "application/json"}

        async with httpx.AsyncClient(timeout=90.0) as client:
            try:
                logger.info("Sending initial simulation request to Gemini API...")
                response = await client.post(url, json=payload, headers=headers)
                
                if response.status_code != 200:
                    logger.error(f"Gemini API error {response.status_code}: {response.text}")
                    raise Exception(f"Gemini API returned code {response.status_code}")

                result = response.json()
                content_text = result["candidates"][0]["content"]["parts"][0]["text"]
                raw_result = json.loads(content_text)
                
                # Convert list-based comparison_metrics to dict for frontend
                metrics_list = raw_result.get("comparison_metrics", [])
                metrics_dict = {}
                for entry in metrics_list:
                    metrics_dict[entry.get("scenario_id")] = {
                        "risk": entry.get("risk", 0),
                        "cost": entry.get("cost", 0),
                        "growth": entry.get("growth", 0),
                        "learning": entry.get("learning", 0),
                        "work_life_balance": entry.get("work_life_balance", 0)
                    }
                raw_result["comparison_metrics"] = metrics_dict

                # Convert list-based recommendations to dict for frontend
                recs_list = raw_result.get("recommendations", [])
                recs_dict = {}
                for entry in recs_list:
                    recs_dict[entry.get("priority")] = entry.get("scenario_id")
                raw_result["recommendations"] = recs_dict

                return raw_result
                
            except Exception as e:
                logger.error(f"Error communicating with Gemini: {e}")
                raise e

    async def generate_followup(
        self,
        decision_query: str,
        context: dict,
        original_response: dict,
        follow_ups_history: List[dict],
        follow_up_query: str
    ) -> Dict[str, Any]:
        """
        Handles follow-up queries within the context of a decision simulation.
        Refines scenarios or returns conversational answers in JSON structure.
        """
        if not GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not configured.")

        # Format history
        history_str = ""
        for idx, f in enumerate(follow_ups_history):
            history_str += f"User: {f.get('query')}\nAI response: {f.get('response_json', {}).get('response_text', '')}\n\n"

        prompt = (
            f"The user is in an active follow-up conversation about a previous decision simulation.\n\n"
            f"Original Query: \"{decision_query}\"\n"
            f"Context: {json.dumps(context, indent=2)}\n\n"
            f"Initial Simulation Scenarios:\n"
            f"{json.dumps(original_response, indent=2)}\n\n"
            f"Conversation History:\n"
            f"{history_str}"
            f"New Follow-Up Question: \"{follow_up_query}\"\n\n"
            f"Instructions:\n"
            f"1. Formulate a direct, detailed response in 'response_text' comparing options, explaining logic, or clarifying assumptions based on the user's question.\n"
            f"2. If the user's follow-up request alters the constraints/parameters of the decision (e.g. 'What if I increase my budget to $50,000?', 'What if I relocate to Germany?', or 'What if we add a startup path?'), generate and provide a revised, complete set of scenarios in 'updated_scenarios', with updated 'updated_comparison_metrics' and 'updated_recommendations'.\n"
            f"3. If the user's request is purely conversational or comparative (e.g. 'Explain why scenario A is riskier than B'), keep 'updated_scenarios', 'updated_comparison_metrics', and 'updated_recommendations' as null/omitted, and answer fully in 'response_text'.\n"
            f"4. Ensure your answer matches the expected JSON structure perfectly."
        )

        system_instruction = (
            "You are ORACLE, a premium AI-powered Decision Intelligence Platform.\n"
            "Respond objectively to user follow-up questions, preserving the context of the original decision and past chat logs.\n"
            "Format the output strictly according to the schema provided."
        )

        raw_schema = FollowUpResponse.model_json_schema()
        clean_schema = dereference_schema(raw_schema)

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "systemInstruction": {
                "parts": [{"text": system_instruction}]
            },
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": clean_schema,
                "temperature": 0.3
            }
        }

        headers = {"Content-Type": "application/json"}

        async with httpx.AsyncClient(timeout=90.0) as client:
            try:
                logger.info("Sending follow-up request to Gemini API...")
                response = await client.post(url, json=payload, headers=headers)
                
                if response.status_code != 200:
                    logger.error(f"Gemini API follow-up error {response.status_code}: {response.text}")
                    raise Exception(f"Gemini API returned code {response.status_code}")

                result = response.json()
                content_text = result["candidates"][0]["content"]["parts"][0]["text"]
                raw_result = json.loads(content_text)

                # Convert updated_comparison_metrics list to dict if present
                if "updated_comparison_metrics" in raw_result and isinstance(raw_result["updated_comparison_metrics"], list):
                    metrics_list = raw_result["updated_comparison_metrics"]
                    metrics_dict = {}
                    for entry in metrics_list:
                        metrics_dict[entry.get("scenario_id")] = {
                            "risk": entry.get("risk", 0),
                            "cost": entry.get("cost", 0),
                            "growth": entry.get("growth", 0),
                            "learning": entry.get("learning", 0),
                            "work_life_balance": entry.get("work_life_balance", 0)
                        }
                    raw_result["updated_comparison_metrics"] = metrics_dict

                # Convert updated_recommendations list to dict if present
                if "updated_recommendations" in raw_result and isinstance(raw_result["updated_recommendations"], list):
                    recs_list = raw_result["updated_recommendations"]
                    recs_dict = {}
                    for entry in recs_list:
                        recs_dict[entry.get("priority")] = entry.get("scenario_id")
                    raw_result["updated_recommendations"] = recs_dict

                return raw_result
                
            except Exception as e:
                logger.error(f"Error during Gemini follow-up generation: {e}")
                raise e
