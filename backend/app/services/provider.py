from abc import ABC, abstractmethod
from typing import Dict, Any, List

class AIProvider(ABC):
    """
    Base class interface for AI engine interactions in ORACLE.
    Allows easy hot-swapping between Gemini, OpenAI, Claude, etc.
    """

    @abstractmethod
    async def generate_simulation(self, query: str, context: dict) -> Dict[str, Any]:
        """
        Takes the decision statement and contextual profile dictionary,
        prompts the LLM, and returns a structured simulation matching SimulationResponse.
        """
        pass

    @abstractmethod
    async def generate_followup(
        self,
        decision_query: str,
        context: dict,
        original_response: dict,
        follow_ups_history: List[dict],
        follow_up_query: str
    ) -> Dict[str, Any]:
        """
        Processes subsequent refining questions, preserving context and past details.
        Returns a JSON payload with updated/refined scenarios or a conversational response.
        """
        pass

def get_ai_provider(provider_name: str = "gemini") -> AIProvider:
    """
    Factory function to retrieve the configured AI provider.
    """
    if provider_name.lower() == "gemini":
        from app.services.gemini import GeminiProvider
        return GeminiProvider()
    else:
        raise ValueError(f"AI Provider '{provider_name}' is not supported.")
