from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_db
from app.models.models import Decision, FollowUp, User
from app.schemas.schemas import DecisionRequest, DecisionOut, DecisionDetailsOut, FollowUpRequest, FollowUpOut
from app.services.auth import get_current_user
from app.services.provider import get_ai_provider
from app.services.pdf import generate_decision_pdf

router = APIRouter(prefix="/api", tags=["decisions"])

class DirectExportRequest(BaseModel):
    query: str
    context: dict
    response_json: dict

@router.post("/analyze", response_model=DecisionOut, status_code=status.HTTP_201_CREATED)
async def analyze_decision(
    request: DecisionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        provider = get_ai_provider("gemini")
        simulation_result = await provider.generate_simulation(
            query=request.query,
            context=request.context.model_dump()
        )
        
        new_decision = Decision(
            user_id=current_user.id,
            query=request.query,
            context=request.context.model_dump(),
            response_json=simulation_result,
            is_favorite=False
        )
        db.add(new_decision)
        db.commit()
        db.refresh(new_decision)
        
        return new_decision
    except Exception as e:
        err_msg = str(e)
        if "503" in err_msg or "429" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="The AI Decision Engine is experiencing temporary high demand. Please try again in a moment."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Decision simulation failed: {err_msg}"
        )

@router.get("/history", response_model=List[DecisionOut])
def get_history(
    search: Optional[str] = None,
    favorite: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Decision).filter(Decision.user_id == current_user.id)
    
    if search:
        query = query.filter(Decision.query.ilike(f"%{search}%"))
        
    if favorite is not None:
        query = query.filter(Decision.is_favorite == favorite)
        
    return query.order_by(Decision.created_at.desc()).all()

@router.get("/history/{id}", response_model=DecisionDetailsOut)
def get_decision_details(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    decision = db.query(Decision).filter(Decision.id == id, Decision.user_id == current_user.id).first()
    if not decision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Simulation not found."
        )
    return decision

@router.put("/history/{id}/favorite", response_model=DecisionOut)
def toggle_favorite(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    decision = db.query(Decision).filter(Decision.id == id, Decision.user_id == current_user.id).first()
    if not decision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Simulation not found."
        )
        
    decision.is_favorite = not decision.is_favorite
    db.commit()
    db.refresh(decision)
    return decision

@router.delete("/history/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_decision(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    decision = db.query(Decision).filter(Decision.id == id, Decision.user_id == current_user.id).first()
    if not decision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Simulation not found."
        )
        
    db.delete(decision)
    db.commit()
    return

@router.post("/history/{id}/followup", response_model=FollowUpOut, status_code=status.HTTP_201_CREATED)
async def create_followup(
    id: int,
    request: FollowUpRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    decision = db.query(Decision).filter(Decision.id == id, Decision.user_id == current_user.id).first()
    if not decision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Simulation not found."
        )

    previous_followups = db.query(FollowUp).filter(FollowUp.decision_id == id).order_by(FollowUp.created_at.asc()).all()
    history_list = [
        {"query": f.query, "response_json": f.response_json} 
        for f in previous_followups
    ]

    try:
        provider = get_ai_provider("gemini")
        followup_result = await provider.generate_followup(
            decision_query=decision.query,
            context=decision.context,
            original_response=decision.response_json,
            follow_ups_history=history_list,
            follow_up_query=request.query
        )

        new_followup = FollowUp(
            decision_id=id,
            query=request.query,
            response_json=followup_result
        )
        db.add(new_followup)
        db.commit()
        db.refresh(new_followup)

        return new_followup
    except Exception as e:
        err_msg = str(e)
        if "503" in err_msg or "429" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="The AI Decision Engine is experiencing temporary high demand. Please try again in a moment."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Follow-up generation failed: {err_msg}"
        )

@router.get("/history/{id}/export")
def export_decision_pdf(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    decision = db.query(Decision).filter(Decision.id == id, Decision.user_id == current_user.id).first()
    if not decision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Simulation not found."
        )

    pdf_buffer = generate_decision_pdf(
        query=decision.query,
        context=decision.context,
        simulation_data=decision.response_json
    )

    filename = f"oracle_report_{id}.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.post("/export")
def export_direct(request: DirectExportRequest):
    try:
        pdf_buffer = generate_decision_pdf(
            query=request.query,
            context=request.context,
            simulation_data=request.response_json
        )
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=oracle_report.pdf"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PDF generation failed: {str(e)}"
        )
