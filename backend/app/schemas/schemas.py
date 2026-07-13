from pydantic import BaseModel, EmailStr, Field
from typing import List, Dict, Any, Optional
import datetime

# --- Auth Schemas ---

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class GoogleLoginRequest(BaseModel):
    token: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserOut(BaseModel):
    id: int
    email: EmailStr
    name: Optional[str]
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# --- Simulation Schemas ---

class DecisionContext(BaseModel):
    age: Optional[str] = ""
    current_salary: Optional[str] = ""
    budget: Optional[str] = ""
    country: Optional[str] = ""
    career_goals: Optional[str] = ""
    risk_appetite: Optional[str] = ""  # e.g., low, medium, high
    time_horizon: Optional[str] = ""   # e.g., 2 years, 5 years, 10 years

class DecisionRequest(BaseModel):
    query: str = Field(..., description="The main decision query, e.g. 'Should I pursue an MBA after MCA?'")
    context: DecisionContext

class ScenarioMilestone(BaseModel):
    year: str = Field(..., description="The target year or relative timeline node (e.g., '2026', 'Year 1')")
    title: str = Field(..., description="The milestone name")
    description: str = Field(..., description="Brief details about what is achieved/done")

class ScenarioSchema(BaseModel):
    id: str = Field(..., description="Unique shorthand code for the scenario, e.g., 'A', 'B', 'C'")
    title: str = Field(..., description="Descriptive scenario name, e.g., 'Scenario A: Continue Working'")
    summary: str = Field(..., description="A 2-3 sentence overview of this choice")
    timeline: List[ScenarioMilestone] = Field(..., description="Chronological milestones/steps for this scenario")
    pros: List[str] = Field(..., description="Key advantages")
    cons: List[str] = Field(..., description="Key disadvantages")
    risks: List[str] = Field(..., description="Potential uncertainties or failures")
    estimated_costs: str = Field(..., description="Projected financial investment needed")
    expected_benefits: str = Field(..., description="Expected career or monetary benefits")
    skills_required: List[str] = Field(..., description="Specific skillsets or certifications needed")
    opportunity_cost: str = Field(..., description="What you give up by selecting this scenario")
    confidence_level: int = Field(..., description="Confidence score out of 100 on model projections")
    reasoning: str = Field(..., description="AI evaluation reasoning behind this option")
    next_steps: List[str] = Field(..., description="Immediate practical steps to initiate this pathway")

class ScenarioMetricEntry(BaseModel):
    scenario_id: str = Field(..., description="The shorthand scenario ID, e.g. 'A', 'B', 'C'")
    risk: int = Field(..., description="Risk score from 1 to 10")
    cost: int = Field(..., description="Cost score from 1 to 10")
    growth: int = Field(..., description="Growth score from 1 to 10")
    learning: int = Field(..., description="Learning score from 1 to 10")
    work_life_balance: int = Field(..., description="Work-life balance score from 1 to 10")

class RecommendationEntry(BaseModel):
    priority: str = Field(..., description="The user priority name, e.g. 'Highest salary', 'Lowest risk', 'Fastest growth', 'Lowest investment', 'Best work-life balance', 'Most learning'")
    scenario_id: str = Field(..., description="The matching scenario ID, e.g. 'A', 'B', 'C'")

# --- Gemini Input Schemas (Using Lists for absolute support without additionalProperties) ---

class SimulationResponse(BaseModel):
    scenarios: List[ScenarioSchema] = Field(..., description="List of generated potential scenarios (between 2 to 4)")
    assumptions: List[str] = Field(..., description="List of explicit starting assumptions used for the simulation")
    disclaimer: str = Field(..., description="A standard disclaimer noting that this is an AI simulated scenario set, not a prediction of the future")
    recommendations: List[RecommendationEntry] = Field(..., description="Priority alignments to matching scenario IDs.")
    comparison_metrics: List[ScenarioMetricEntry] = Field(..., description="Scores from 1 to 10 for each scenario in each dimension.")

class FollowUpResponse(BaseModel):
    response_text: str = Field(..., description="Direct conversational explanation, comparison analysis, or answer to the user's questions.")
    updated_scenarios: Optional[List[ScenarioSchema]] = Field(None, description="If the follow-up changes parameters or constraints, return the complete list of revised scenarios. Else null/omit.")
    updated_comparison_metrics: Optional[List[ScenarioMetricEntry]] = Field(None, description="Updated risk/cost/growth metrics matching the new scenarios. Else null/omit.")
    updated_recommendations: Optional[List[RecommendationEntry]] = Field(None, description="Updated priority-to-scenario map matching the new scenarios. Else null/omit.")

# --- FastAPI Output Schemas (Using Dicts for frontend compatibility) ---

class SimulationResponseOut(BaseModel):
    scenarios: List[ScenarioSchema]
    assumptions: List[str]
    disclaimer: str
    recommendations: Dict[str, str]
    comparison_metrics: Dict[str, Dict[str, int]]

class FollowUpResponseOut(BaseModel):
    response_text: str
    updated_scenarios: Optional[List[ScenarioSchema]] = None
    updated_comparison_metrics: Optional[Dict[str, Dict[str, int]]] = None
    updated_recommendations: Optional[Dict[str, str]] = None

class DecisionOut(BaseModel):
    id: int
    query: str
    context: DecisionContext
    response_json: SimulationResponseOut
    is_favorite: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# --- Follow-Up Schemas ---

class FollowUpRequest(BaseModel):
    query: str = Field(..., description="The follow-up question, e.g. 'What if I increase my budget to $50,000?'")

class FollowUpOut(BaseModel):
    id: int
    query: str
    response_json: FollowUpResponseOut  # Contains structured response text + optional updated scenarios
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class DecisionDetailsOut(DecisionOut):
    follow_ups: List[FollowUpOut] = []

    class Config:
        from_attributes = True
