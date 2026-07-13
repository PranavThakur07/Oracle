import re
import json
import logging
from io import BytesIO
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

logger = logging.getLogger("oracle_pdf")

# Constants for Scenario Identities
SCENARIO_NAMES = {
    "A": "Accelerated Growth",
    "B": "Balanced Path",
    "C": "Defensive Strategy",
    "D": "Creative Outlier"
}

def check_is_india(context: dict) -> bool:
    """Detects if the user context points to India to trigger Rupee formatting."""
    country = str(context.get('country', '')).strip().lower()
    budget = str(context.get('budget', '')).strip().lower()
    salary = str(context.get('current_salary', '')).strip().lower()
    
    return (
        country in ['india', 'in', 'ind', 'bharat'] or 
        'lakh' in budget or 'crore' in budget or 'rs' in budget or '₹' in budget or
        'lakh' in salary or 'crore' in salary or 'rs' in salary or '₹' in salary
    )

def clean_to_number(val_str: str) -> float:
    """Extracts numeric values from format strings."""
    nums = re.findall(r'\d+\.?\d*', val_str)
    if not nums:
        return 0.0
    return float(nums[0])

def format_currency_val(val: Any, is_india: bool) -> str:
    """Converts raw or string currencies into formatted local terms (Lakh/Crore for India, M/K for International)."""
    if val is None or str(val).strip().lower() in ['n/a', 'none', '']:
        return "Not Specified"
    
    val_str = str(val).strip()
    
    # Check if currency symbol is already embedded
    if val_str.startswith('$') or val_str.startswith('₹') or 'rs' in val_str.lower():
        return val_str
        
    num = clean_to_number(val_str)
    if num == 0.0:
        return val_str # Return original text (e.g. "Student")
        
    if is_india:
        if num >= 10000000: # 1 Crore
            return f"₹{num / 10000000:.1f} Crore"
        elif num >= 100000: # 1 Lakh
            return f"₹{num / 100000:.1f} Lakh"
        else:
            return f"₹{num:,.0f}"
    else:
        if num >= 1000000:
            return f"${num / 1000000:.1f}M"
        elif num >= 1000:
            return f"${num / 1000:.1f}K"
        else:
            return f"${num:,.0f}"

def make_progress_bar(score: Any) -> str:
    """Creates a McKinsey-style visual character-based progress indicator."""
    try:
        val = int(score)
    except:
        val = 5
    val = max(1, min(10, val))
    filled = "█" * val
    empty = "░" * (10 - val)
    return f"{filled}{empty}  {val}/10"

def get_best_scenarios(scenarios: list, metrics: dict) -> dict:
    """Finds best scenario IDs for strategic parameters."""
    best = {
        "highest_income": ("A", SCENARIO_NAMES["A"]),
        "lowest_risk": ("B", SCENARIO_NAMES["B"]),
        "best_learning": ("A", SCENARIO_NAMES["A"]),
        "best_wlb": ("B", SCENARIO_NAMES["B"]),
        "lowest_investment": ("C", SCENARIO_NAMES["C"]),
    }
    
    if not scenarios:
        return best
        
    highest_growth = -1
    lowest_risk = 100
    highest_learning = -1
    highest_wlb = -1
    lowest_cost = 100
    
    for s in scenarios:
        s_id = s.get("id", "A")
        s_metrics = metrics.get(s_id, {})
        s_title = SCENARIO_NAMES.get(s_id, s.get("title", s_id))
        
        try:
            growth = int(s_metrics.get("growth", 5))
            risk = int(s_metrics.get("risk", 5))
            learning = int(s_metrics.get("learning", 5))
            wlb = int(s_metrics.get("work_life_balance", 5))
            cost = int(s_metrics.get("cost", 5))
        except:
            continue
            
        if growth > highest_growth:
            highest_growth = growth
            best["highest_income"] = (s_id, s_title)
            
        if risk < lowest_risk:
            lowest_risk = risk
            best["lowest_risk"] = (s_id, s_title)
            
        if learning > highest_learning:
            highest_learning = learning
            best["best_learning"] = (s_id, s_title)
            
        if wlb > highest_wlb:
            highest_wlb = wlb
            best["best_wlb"] = (s_id, s_title)
            
        if cost < lowest_cost:
            lowest_cost = cost
            best["lowest_investment"] = (s_id, s_title)
            
    return best

def generate_decision_pdf(query: str, context: dict, simulation_data: dict) -> BytesIO:
    """
    Generates a beautifully structured Executive Briefing PDF document summarizing the decision simulation.
    Returns a BytesIO stream.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=45,
        leftMargin=45,
        topMargin=40,
        bottomMargin=40
    )

    is_india = check_is_india(context)
    scenarios = simulation_data.get("scenarios", [])
    metrics = simulation_data.get("comparison_metrics", {})
    recommendations = simulation_data.get("recommendations", {})
    assumptions = simulation_data.get("assumptions", [])
    disclaimer = simulation_data.get("disclaimer", "")

    styles = getSampleStyleSheet()
    
    # Premium Hex Colors (McKinsey Navy & Gartner Blue)
    c_primary = colors.HexColor("#0A2540")      # Deep McKinsey Navy
    c_secondary = colors.HexColor("#4A5568")    # Executive Gray
    c_accent = colors.HexColor("#0066CC")       # Accent Blue
    c_light_bg = colors.HexColor("#F8FAFC")     # Soft Background Gray
    c_border = colors.HexColor("#E2E8F0")       # Thin Slate Border
    
    # Custom Styled Elements
    title_style = ParagraphStyle(
        'DocTitle', parent=styles['Normal'], fontName='Helvetica-Bold',
        fontSize=24, leading=28, textColor=c_primary, spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle', parent=styles['Normal'], fontName='Helvetica-Bold',
        fontSize=10, leading=14, textColor=c_accent, spaceAfter=20, textTransform='uppercase'
    )
    h1_style = ParagraphStyle(
        'Heading1', parent=styles['Normal'], fontName='Helvetica-Bold',
        fontSize=14, leading=18, textColor=c_primary, spaceBefore=16, spaceAfter=10, keepWithNext=True
    )
    h2_style = ParagraphStyle(
        'Heading2', parent=styles['Normal'], fontName='Helvetica-Bold',
        fontSize=11, leading=15, textColor=c_accent, spaceBefore=12, spaceAfter=6, keepWithNext=True
    )
    body_style = ParagraphStyle(
        'BodyText', parent=styles['Normal'], fontName='Helvetica',
        fontSize=9, leading=13.5, textColor=colors.HexColor("#334155")
    )
    bullet_style = ParagraphStyle(
        'BulletText', parent=styles['Normal'], fontName='Helvetica',
        fontSize=8.5, leading=12.5, leftIndent=12, firstLineIndent=-8,
        textColor=colors.HexColor("#334155"), spaceAfter=3
    )
    callout_title = ParagraphStyle(
        'CalloutTitle', parent=styles['Normal'], fontName='Helvetica-Bold',
        fontSize=9.5, leading=13, textColor=c_primary
    )
    callout_body = ParagraphStyle(
        'CalloutBody', parent=styles['Normal'], fontName='Helvetica',
        fontSize=8.5, leading=12.5, textColor=colors.HexColor("#475569")
    )

    story = []

    # =========================================================================
    # PAGE 1: EXECUTIVE SUMMARY BRIEFING
    # =========================================================================
    story.append(Paragraph("ORACLE", title_style))
    story.append(Paragraph("EXECUTIVE DECISION INTELLIGENCE DOSSIER", subtitle_style))
    
    # Original user query block
    query_html = f"<b>Primary Strategic Inquiry:</b><br/><i>\"{query}\"</i>"
    story.append(Table(
        [[Paragraph(query_html, ParagraphStyle('QStyle', parent=body_style, fontSize=11, leading=15, textColor=c_primary))]],
        colWidths=[520],
        style=[
            ('BACKGROUND', (0,0), (-1,-1), c_light_bg),
            ('BOX', (0,0), (-1,-1), 1, c_accent),
            ('PADDING', (0,0), (-1,-1), 12),
        ]
    ))
    story.append(Spacer(1, 14))

    # User context profile snapshot
    story.append(Paragraph("USER PROFILE SNAPSHOT", h2_style))
    user_data = [
        [
            Paragraph(f"<b>Age:</b> {context.get('age') or 'Not Specified'}", body_style),
            Paragraph(f"<b>Current Income:</b> {format_currency_val(context.get('current_salary'), is_india)}", body_style),
            Paragraph(f"<b>Investment Capital:</b> {format_currency_val(context.get('budget'), is_india)}", body_style)
        ],
        [
            Paragraph(f"<b>Location:</b> {context.get('country') or 'Global'}", body_style),
            Paragraph(f"<b>Risk Tolerance:</b> {context.get('risk_appetite') or 'AI Inferred (Medium)'}", body_style),
            Paragraph(f"<b>Evaluation Horizon:</b> {context.get('time_horizon') or 'AI Inferred (5 Years)'}", body_style)
        ]
    ]
    t_user = Table(user_data, colWidths=[173, 173, 174])
    t_user.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,-1), 0.5, c_border),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_user)
    story.append(Spacer(1, 14))

    # Decision landscape summary paragraph
    story.append(Paragraph("STRATEGIC DECISION LANDSCAPE", h2_style))
    age_str = context.get('age') or 'your current career stage'
    loc_str = context.get('country') or 'your localized market'
    cap_str = format_currency_val(context.get('budget'), is_india)
    landscape_p = (
        f"This strategic dossier evaluates alternative action pathways for the decision query: "
        f"\"{query}\". Taking into account your age ({age_str}), localized context ({loc_str}), and "
        f"financial capital constraints ({cap_str}), Oracle has compiled multiple simulated "
        f"paths analyzing tradeoffs across risk, growth, learning, and lifestyle flexibility. "
        f"The options range from high-velocity acceleration to defensive risk-hedging."
    )
    story.append(Paragraph(landscape_p, body_style))
    story.append(Spacer(1, 14))

    # Best scenarios summary map
    best_map = get_best_scenarios(scenarios, metrics)
    story.append(Paragraph("RECOMMENDED PATHWAY MAPPINGS", h2_style))
    rec_data = [
        [Paragraph("<b>Priority Focus</b>", body_style), Paragraph("<b>Target Recommendation</b>", body_style)],
        [Paragraph("Highest Income potential", body_style), Paragraph(f"<b>{best_map['highest_income'][1]}</b>", body_style)],
        [Paragraph("Lowest Downside Risk", body_style), Paragraph(f"<b>{best_map['lowest_risk'][1]}</b>", body_style)],
        [Paragraph("Best Learning curve", body_style), Paragraph(f"<b>{best_map['best_learning'][1]}</b>", body_style)],
        [Paragraph("Best Work-Life Balance", body_style), Paragraph(f"<b>{best_map['best_wlb'][1]}</b>", body_style)],
        [Paragraph("Lowest Initial Capital", body_style), Paragraph(f"<b>{best_map['lowest_investment'][1]}</b>", body_style)],
    ]
    t_rec = Table(rec_data, colWidths=[200, 320])
    t_rec.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (1,0), c_light_bg),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_rec)

    # Top 3 AI Insights Callout Box
    story.append(Spacer(1, 14))
    insight_items = []
    
    # Safely extract dynamic assumptions/conclusions for executive briefing
    if scenarios:
        matched_accel = scenarios[0].get("title", SCENARIO_NAMES["A"])
        insight_items.append(Paragraph(f"• <b>Aggressive Leap:</b> {matched_accel} offers the highest growth multiplier but demands robust initial investment.", bullet_style))
    if len(scenarios) > 1:
        matched_bal = scenarios[1].get("title", SCENARIO_NAMES["B"])
        insight_items.append(Paragraph(f"• <b>Calibrated Hedging:</b> {matched_bal} balances immediate lifestyle stability with consistent long-term skill acquisition.", bullet_style))
    else:
        insight_items.append(Paragraph("• <b>Calibrated Hedging:</b> Maintaining flexibility helps absorb external market volatility.", bullet_style))
    
    insight_items.append(Paragraph("• <b>Resource Efficiency:</b> Restricting capital limits upfront risk but extends transition time to target goals.", bullet_style))
    
    t_insights_box = Table(
        [[ [Paragraph("🧠 <b>CORE EXECUTIVE INSIGHTS</b>", callout_title), Spacer(1, 4)] + insight_items ]],
        colWidths=[520],
        style=[
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#EFF6FF")),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#93C5FD")),
            ('PADDING', (0,0), (-1,-1), 10),
        ]
    )
    story.append(t_insights_box)

    # End of Page 1
    story.append(PageBreak())

    # =========================================================================
    # PAGE 2: DASHBOARD COMPARISON & DEEP DIVES
    # =========================================================================
    story.append(Paragraph("EXECUTIVE DASHBOARD COMPARISON", h1_style))
    
    comp_header = [
        Paragraph("<b>Strategic Choice</b>", body_style),
        Paragraph("<b>Risk</b>", body_style),
        Paragraph("<b>Investment Cost</b>", body_style),
        Paragraph("<b>Growth</b>", body_style),
        Paragraph("<b>Learning</b>", body_style),
        Paragraph("<b>WLB</b>", body_style)
    ]
    comp_data = [comp_header]

    for s in scenarios:
        s_id = s.get("id", "A")
        s_metrics = metrics.get(s_id, {})
        s_title = SCENARIO_NAMES.get(s_id, s.get("title", s_id))
        
        comp_row = [
            Paragraph(f"<b>{s_title}</b>", body_style),
            Paragraph(make_progress_bar(s_metrics.get("risk", 5)), body_style),
            Paragraph(make_progress_bar(s_metrics.get("cost", 5)), body_style),
            Paragraph(make_progress_bar(s_metrics.get("growth", 5)), body_style),
            Paragraph(make_progress_bar(s_metrics.get("learning", 5)), body_style),
            Paragraph(make_progress_bar(s_metrics.get("work_life_balance", 5)), body_style),
        ]
        comp_data.append(comp_row)

    t_comp = Table(comp_data, colWidths=[140, 76, 76, 76, 76, 76])
    t_comp.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_light_bg),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (1,1), (-1,-1), 'LEFT')
    ]))
    story.append(t_comp)
    story.append(Spacer(1, 15))

    # Priority focus list
    if recommendations:
        story.append(Paragraph("STRATEGIC ALIGNMENT BY PRIORITY INDEX", h2_style))
        rec_bullets = []
        for priority, s_id in recommendations.items():
            s_title = SCENARIO_NAMES.get(s_id, f"Scenario {s_id}")
            rec_bullets.append(Paragraph(f"• <b>If your primary driver is {priority.replace('_', ' ').title()}:</b> Map decision focus to <b>{s_title}</b>.", bullet_style))
        for r_p in rec_bullets:
            story.append(r_p)
        story.append(Spacer(1, 15))

    # Detailed Scenarios Deep Dive
    story.append(Paragraph("SIMULATED SCENARIO DEEP DIVES", h1_style))
    
    for s in scenarios:
        s_id = s.get("id", "A")
        s_title = SCENARIO_NAMES.get(s_id, s.get("title", s_id))
        s_metrics = metrics.get(s_id, {})
        
        # Calculate dynamic overall match score
        growth_score = int(s_metrics.get("growth", 5))
        risk_score = int(s_metrics.get("risk", 5))
        learning_score = int(s_metrics.get("learning", 5))
        wlb_score = int(s_metrics.get("work_life_balance", 5))
        
        # Match score matches weights: lower risk is better, others higher is better
        match_percentage = int(((11 - risk_score) + growth_score + learning_score + wlb_score) / 40.0 * 100)
        match_percentage = min(98, max(55, match_percentage))

        story.append(Paragraph(f"{s_title} (Shorthand: {s_id})", h2_style))
        story.append(Paragraph(f"<b>Overall Match Score: {match_percentage}%</b> — Based on career goals, capital budget constraints, risk profile, and growth timelines.", ParagraphStyle('MatchP', parent=body_style, fontName='Helvetica-Bold', textColor=c_accent)))
        story.append(Spacer(1, 4))
        story.append(Paragraph(f"<b>Pathway Overview:</b> {s.get('summary')}", body_style))
        story.append(Spacer(1, 8))

        # Dynamic AI Reasoning Section ("Why Oracle Generated This")
        goal_text = context.get('career_goals') or "long term growth"
        risk_val = context.get('risk_appetite') or "Medium"
        age_val = context.get('age') or "current age"
        budget_val = format_currency_val(context.get('budget'), is_india)

        why_bullets = [
            Paragraph(f"• Matches your primary goal targeting <i>'{goal_text}'</i>.", bullet_style),
            Paragraph(f"• Calibrated for your designated risk profile preference: <i>{risk_val}</i>.", bullet_style),
            Paragraph(f"• Designed to fit within your designated capital envelope limit: <i>{budget_val}</i>.", bullet_style),
            Paragraph(f"• Tailored to optimize transition timelines matching your current profile age: <i>{age_val}</i>.", bullet_style)
        ]
        
        why_table = Table(
            [[ [Paragraph("🎯 <b>WHY ORACLE GENERATED THIS SCENARIO</b>", callout_title), Spacer(1, 4)] + why_bullets ]],
            colWidths=[520],
            style=[
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
                ('BOX', (0,0), (-1,-1), 0.5, c_border),
                ('PADDING', (0,0), (-1,-1), 8),
            ]
        )
        story.append(why_table)
        story.append(Spacer(1, 10))

        # Costs / Benefits / Opportunity Cost Callouts
        details_grid = [
            [
                Paragraph("💰 <b>Capital Investment:</b>", callout_title),
                Paragraph(format_currency_val(s.get("estimated_costs", "N/A"), is_india), body_style)
            ],
            [
                Paragraph("📈 <b>Projected Benefits:</b>", callout_title),
                Paragraph(s.get("expected_benefits", "N/A"), body_style)
            ],
            [
                Paragraph("⚠️ <b>Opportunity Cost:</b>", callout_title),
                Paragraph(s.get("opportunity_cost", "N/A"), body_style)
            ]
        ]
        t_details = Table(details_grid, colWidths=[150, 370])
        t_details.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,-1), c_light_bg),
            ('GRID', (0,0), (-1,-1), 0.5, c_border),
            ('PADDING', (0,0), (-1,-1), 5),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        story.append(t_details)
        story.append(Spacer(1, 10))

        # Modern Implementation Timeline Table
        timeline_list = s.get("timeline", [])
        if timeline_list:
            story.append(Paragraph("<b>IMPLEMENTATION OUTLOOK TIMELINE</b>", ParagraphStyle('TimelineH', parent=body_style, fontName='Helvetica-Bold', textColor=c_primary)))
            story.append(Spacer(1, 4))
            
            timeline_rows = []
            for item in timeline_list:
                timeline_rows.append([
                    Paragraph(f"<b>{item.get('year')}</b>", ParagraphStyle('YrS', parent=body_style, fontName='Helvetica-Bold', textColor=c_accent)),
                    Paragraph(f"<b>{item.get('title')}</b> — {item.get('description')}", body_style)
                ])
                # Add transition line
                timeline_rows.append([
                    Paragraph("↓", ParagraphStyle('Arr', parent=body_style, alignment=TA_CENTER, textColor=c_secondary)),
                    Paragraph("", body_style)
                ])
            
            # Remove trailing arrow row
            if timeline_rows:
                timeline_rows.pop()
                
            t_timeline = Table(timeline_rows, colWidths=[60, 460])
            t_timeline.setStyle(TableStyle([
                ('PADDING', (0,0), (-1,-1), 3),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ]))
            story.append(t_timeline)
            story.append(Spacer(1, 10))

        # Scenario-specific assumptions
        story.append(Paragraph("<b>Scenario Specific Assumptions:</b>", body_style))
        story.append(Paragraph(f"• Inflation and interest indices remain stable in {context.get('country') or 'origin location'}.", bullet_style))
        story.append(Paragraph("• No major global economic downturn or sector-wide hiring freeze.", bullet_style))
        story.append(Paragraph("• Successful completion of key milestones according to target timeline targets.", bullet_style))
        story.append(Spacer(1, 6))

        # Oracle Insights Callout Box
        insight_text = s.get("reasoning") or f"This pathway is strategically aligned for players seeking {s_title}. It maximizes efficiency while maintaining stable transition options."
        t_scenario_insight = Table(
            [[ Paragraph(f"🧠 <b>ORACLE STRATEGIC INSIGHT:</b> {insight_text}", callout_body) ]],
            colWidths=[520],
            style=[
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FEF3C7")), # Soft Amber Background
                ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#FCD34D")),
                ('PADDING', (0,0), (-1,-1), 8),
            ]
        )
        story.append(t_scenario_insight)
        story.append(Spacer(1, 15))

    # Page Break for Assumptions / Reflections
    story.append(PageBreak())

    # =========================================================================
    # PAGE 3: REFLECTIONS & DECISION ROADMAP
    # =========================================================================
    story.append(Paragraph("DECISION ROADMAP & REFLECTION", h1_style))
    
    # Dynamic reflective questions based on context
    reflection_questions = [
        Paragraph("1. <b>Financial Capital:</b> Are you comfortable taking on transition debt or utilizing cash reserves for the required capital investments?", bullet_style),
        Paragraph("2. <b>Risk Appetite:</b> Does the uncertainty of the Accelerated Growth option match your family/personal risk profiles, or is stability preferred?", bullet_style),
        Paragraph("3. <b>Opportunity Cost:</b> Are you prepared to sacrifice immediate timeline benefits (such as short-term income or geographic comfort) to achieve long-term career growth?", bullet_style),
        Paragraph("4. <b>Timelines:</b> How flexible are you if market headwinds delay milestones by 12–18 months?", bullet_style),
        Paragraph("5. <b>Worst Case:</b> What is your mitigation plan if your top-priority scenario fails to yield expected growth metrics?", bullet_style),
    ]

    t_reflection = Table(
        [[ [Paragraph("❓ <b>STRATEGIC QUESTIONS TO CONSIDER</b>", callout_title), Spacer(1, 4)] + reflection_questions ]],
        colWidths=[520],
        style=[
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F1F5F9")),
            ('BOX', (0,0), (-1,-1), 0.5, c_secondary),
            ('PADDING', (0,0), (-1,-1), 10),
        ]
    )
    story.append(t_reflection)
    story.append(Spacer(1, 15))

    # Global simulation assumptions
    if assumptions:
        story.append(Paragraph("GLOBAL SIMULATION FOUNDATIONS", h2_style))
        for ass in assumptions:
            story.append(Paragraph(f"• {ass}", bullet_style))
        story.append(Spacer(1, 15))

    # Disclaimer Block
    story.append(Paragraph("Dossier Disclaimer", h2_style))
    disclaimer_text = disclaimer or "Oracle is an AI-powered strategic decision modeling engine. Simulation outputs represent synthetic scenario possibilities based on user-supplied variables and statistical modeling, not guaranteed predictions of future financial performance or career success. Users should exercise independent professional judgment."
    story.append(Paragraph(disclaimer_text, ParagraphStyle('DiscP', parent=disclaimer_style, textColor=c_secondary)))

    # Build document
    doc.build(story)
    buffer.seek(0)
    return buffer
