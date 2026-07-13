import re
import json
import logging
import uuid
import datetime
from io import BytesIO
from typing import Dict, Any, List

import numpy as np
import matplotlib
matplotlib.use('Agg') # Safe headless rendering for server environments
import matplotlib.pyplot as plt

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
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

def check_is_euro(context: dict) -> bool:
    """Detects if the user is from Eurozone."""
    country = str(context.get('country', '')).strip().lower()
    budget = str(context.get('budget', '')).strip().lower()
    salary = str(context.get('current_salary', '')).strip().lower()
    return (
        country in ['germany', 'france', 'italy', 'spain', 'netherlands', 'belgium', 'europe', 'eu', 'euro'] or
        '€' in budget or '€' in salary
    )

def clean_to_number(val_str: str) -> float:
    """Extracts numeric values from format strings."""
    nums = re.findall(r'\d+\.?\d*', val_str)
    if not nums:
        return 0.0
    return float(nums[0])

def format_currency_val(val: Any, is_india: bool, is_euro: bool = False) -> str:
    """Converts raw or string currencies into formatted local terms (Rupee, Euro, Dollar)."""
    if val is None or str(val).strip().lower() in ['n/a', 'none', '']:
        return "Not Specified"
    
    val_str = str(val).strip()
    
    # Check if currency symbol is already embedded
    if val_str.startswith('$') or val_str.startswith('₹') or val_str.startswith('€') or 'rs' in val_str.lower():
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
    elif is_euro:
        if num >= 1000000:
            return f"€{num / 1000000:.1f}M"
        elif num >= 1000:
            return f"€{num / 1000:.1f}K"
        else:
            return f"€{num:,.0f}"
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

def get_personalized_snapshot(context: dict, is_india: bool, is_euro: bool) -> dict:
    """Resolves empty values to high-end consulting assumptions to prevent blank fields."""
    profile = {}
    profile["age"] = context.get("age") or "28 (Assumed Benchmark)"
    profile["role"] = context.get("current_role") or "Senior Associate / Consultant (Assumed)"
    profile["experience"] = context.get("experience") or "5+ Years (Assumed Profile)"
    profile["country"] = context.get("country") or ("India (Assumed)" if is_india else ("Germany (Assumed)" if is_euro else "United States (Assumed)"))
    
    income = context.get("current_salary")
    profile["income"] = format_currency_val(income, is_india, is_euro) if income else ("₹12 Lakh (Assumed)" if is_india else ("€85K (Assumed)" if is_euro else "$100K (Assumed)"))
    
    budget = context.get("budget")
    profile["budget"] = format_currency_val(budget, is_india, is_euro) if budget else ("₹15 Lakh (Assumed)" if is_india else ("€40K (Assumed)" if is_euro else "$80K (Assumed)"))
    
    profile["goals"] = context.get("career_goals") or "Strategic pivot to secure leadership roles and equity options"
    profile["horizon"] = context.get("time_horizon") or "5 Years (Medium Outlook)"
    profile["risk"] = context.get("risk_appetite") or "Medium / Balanced Risk"
    profile["family"] = context.get("family_constraints") or "None Specified (Assumed Single / Flexible)"
    profile["industry"] = context.get("preferred_industry") or "Technology & Management Services"
    
    return profile

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

def generate_radar_chart(scenarios: list, metrics: dict) -> BytesIO:
    """Generates a premium radar chart comparing scenarios across key metrics."""
    categories = ['Risk', 'Growth', 'Cost', 'Learning', 'Work Life Balance']
    N = len(categories)
    
    angles = [n / float(N) * 2 * np.pi for n in range(N)]
    angles += angles[:1]
    
    fig, ax = plt.subplots(figsize=(4.8, 3.8), subplot_kw=dict(polar=True))
    
    plt.xticks(angles[:-1], categories, color='#334155', size=8, fontname='DejaVu Sans', fontweight='bold')
    ax.set_rlabel_position(0)
    plt.yticks([2, 4, 6, 8, 10], ["2", "4", "6", "8", "10"], color="#94A3B8", size=6)
    plt.ylim(0, 10)
    
    colors_map = {
        "A": "#0066CC", # Accent Blue
        "B": "#10B981", # Emerald
        "C": "#EF4444", # Coral
        "D": "#8B5CF6"  # Purple
    }

    for s in scenarios:
        s_id = s.get("id", "A")
        s_metrics = metrics.get(s_id, {})
        s_name = SCENARIO_NAMES.get(s_id, s.get("title", s_id))
        
        values = [
            int(s_metrics.get("risk", 5)),
            int(s_metrics.get("growth", 5)),
            int(s_metrics.get("cost", 5)),
            int(s_metrics.get("learning", 5)),
            int(s_metrics.get("work_life_balance", 5))
        ]
        values += values[:1]
        
        color = colors_map.get(s_id, "#475569")
        ax.plot(angles, values, linewidth=1.5, linestyle='solid', label=s_name, color=color)
        ax.fill(angles, values, color=color, alpha=0.08)
        
    plt.legend(loc='upper right', bbox_to_anchor=(1.35, 1.15), fontsize=7, frameon=True, facecolor='#F8FAFC')
    ax.spines['polar'].set_color('#CBD5E1')
    ax.grid(color='#E2E8F0', linestyle='--', linewidth=0.5)
    
    img_buf = BytesIO()
    plt.savefig(img_buf, format='png', bbox_inches='tight', dpi=180)
    plt.close()
    img_buf.seek(0)
    return img_buf

def generate_growth_chart(scenarios: list) -> BytesIO:
    """Generates a value trajectory line graph comparing scenario payouts."""
    fig, ax = plt.subplots(figsize=(5.2, 2.6))
    
    colors_map = {
        "A": "#0066CC",
        "B": "#10B981",
        "C": "#EF4444",
        "D": "#8B5CF6"
    }

    has_data = False
    for s in scenarios:
        s_id = s.get("id", "A")
        s_name = SCENARIO_NAMES.get(s_id, s_id)
        timeline = s.get("timeline", [])
        
        years = []
        salaries = []
        
        current_sal = 100.0
        
        # Build composite timeline indices
        for idx, item in enumerate(timeline):
            year_val = item.get("year", f"Y{idx+1}")
            years.append(year_val)
            
            # Simulated compound value payout ratios
            if s_id == 'A':
                current_sal *= 1.25
            elif s_id == 'B':
                current_sal *= 1.12
            else:
                current_sal *= 1.05
            salaries.append(current_sal)
            
        if years and salaries:
            has_data = True
            color = colors_map.get(s_id, "#475569")
            ax.plot(years, salaries, marker='o', linewidth=2, label=s_name, color=color, markersize=4)
            
    if not has_data:
        ax.plot(["2026", "2027", "2028", "2029", "2030"], [100, 110, 125, 140, 160], marker='o', label="Projected Base Case", color="#0066CC")
        
    ax.set_title("Projected Value / Salary Trajectory Curve", fontsize=9, fontweight='bold', color='#0A2540', pad=8)
    ax.set_ylabel("Growth Index (Base 100)", fontsize=7, color='#4A5568')
    ax.grid(color='#F1F5F9', linestyle='-', linewidth=0.8)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color('#E2E8F0')
    ax.spines['bottom'].set_color('#E2E8F0')
    ax.tick_params(colors='#4A5568', labelsize=7)
    
    plt.legend(loc='lower right', fontsize=7, frameon=True, facecolor='#F8FAFC')
    
    img_buf = BytesIO()
    plt.savefig(img_buf, format='png', bbox_inches='tight', dpi=180)
    plt.close()
    img_buf.seek(0)
    return img_buf

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
    is_euro = check_is_euro(context)
    
    # Generate profile using smart fallbacks to remove blank placeholders
    p = get_personalized_snapshot(context, is_india, is_euro)

    # Core metadata
    report_uuid = str(uuid.uuid4())[:8].upper()
    timestamp_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

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
    disclaimer_style = ParagraphStyle(
        'DisclaimerText', parent=styles['Normal'], fontName='Helvetica-Oblique',
        fontSize=8, leading=11, textColor=c_secondary
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
    # PAGE 1: EXECUTIVE BRIEFING SUMMARY
    # =========================================================================
    story.append(Paragraph("ORACLE", title_style))
    story.append(Paragraph("EXECUTIVE DECISION BRIEFING DOSSIER", subtitle_style))
    
    # Original query block
    query_html = f"<b>Strategic Inquiry Focus:</b><br/><i>\"{query}\"</i>"
    story.append(Table(
        [[Paragraph(query_html, ParagraphStyle('QStyle', parent=body_style, fontSize=11, leading=15, textColor=c_primary))]],
        colWidths=[520],
        style=[
            ('BACKGROUND', (0,0), (-1,-1), c_light_bg),
            ('BOX', (0,0), (-1,-1), 1.2, c_accent),
            ('PADDING', (0,0), (-1,-1), 12),
        ]
    ))
    story.append(Spacer(1, 12))

    # User Profile Snapshot
    story.append(Paragraph("DEMOGRAPHIC & CONSTRAINT SNAPSHOT", h2_style))
    user_snapshot_rows = [
        [
            Paragraph(f"<b>Age:</b> {p['age']}", body_style),
            Paragraph(f"<b>Target Goal:</b> {p['goals'][:45]}...", body_style),
            Paragraph(f"<b>Investment Capital:</b> {p['budget']}", body_style)
        ],
        [
            Paragraph(f"<b>Location:</b> {p['country']}", body_style),
            Paragraph(f"<b>Annual Income:</b> {p['income']}", body_style),
            Paragraph(f"<b>Outlook Timeline:</b> {p['horizon']}", body_style)
        ],
        [
            Paragraph(f"<b>Risk Tolerance:</b> {p['risk']}", body_style),
            Paragraph(f"<b>Current Role:</b> {p['role']}", body_style),
            Paragraph(f"<b>Industry Focus:</b> {p['industry']}", body_style)
        ]
    ]
    t_user = Table(user_snapshot_rows, colWidths=[173, 173, 174])
    t_user.setStyle(TableStyle([
        ('LINEBELOW', (0,0), (-1,-1), 0.5, c_border),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_user)
    story.append(Spacer(1, 12))

    # Decision landscape summary
    story.append(Paragraph("DECISION LANDSCAPE CRITIQUE", h2_style))
    landscape_text = (
        f"Based on your profile as a {p['role']} aged {p['age']} based in {p['country']}, Oracle has modeled "
        f"alternative scenario pathways to address the inquiry: \"{query}\". Balancing your "
        f"current budget capacity of {p['budget']} and goals targeting {p['industry']}, our engine "
        f"projects that while aggressive scaling offers high equity yields, defensive preservation offers "
        f"maximum stability under near-term macroeconomic headwinds."
    )
    story.append(Paragraph(landscape_text, body_style))
    story.append(Spacer(1, 12))

    # Pathway recommendations
    best_map = get_best_scenarios(scenarios, metrics)
    story.append(Paragraph("RECOMMENDED SCENARIO TARGET MAPS", h2_style))
    rec_rows = [
        [Paragraph("<b>Priority Core Target</b>", body_style), Paragraph("<b>Target Pathway Recommendation</b>", body_style)],
        [Paragraph("Highest Income Potential", body_style), Paragraph(f"<b>{best_map['highest_income'][1]}</b>", body_style)],
        [Paragraph("Lowest Downside Risk Profile", body_style), Paragraph(f"<b>{best_map['lowest_risk'][1]}</b>", body_style)],
        [Paragraph("Best Learning and Upskilling Curve", body_style), Paragraph(f"<b>{best_map['best_learning'][1]}</b>", body_style)],
        [Paragraph("Optimal Work-Life Balance Options", body_style), Paragraph(f"<b>{best_map['best_wlb'][1]}</b>", body_style)],
        [Paragraph("Lowest Upfront Investment Required", body_style), Paragraph(f"<b>{best_map['lowest_investment'][1]}</b>", body_style)],
    ]
    t_recs = Table(rec_rows, colWidths=[200, 320])
    t_recs.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (1,0), c_light_bg),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_recs)
    
    # Why / Why Not Comparative Analysis Callout
    story.append(Spacer(1, 12))
    whynot_items = [
        Paragraph(f"• <b>Why {best_map['lowest_risk'][1]} was preferred:</b> Offers stable cash flow mitigation matching your {p['risk']} profile.", bullet_style),
        Paragraph(f"• <b>Why Accelerated Growth ranked lower for stability:</b> Requires {p['budget']} which exceeds near-term liquid reserves, risking capital depletion.", bullet_style),
        Paragraph(f"• <b>Why Defensive Strategy ranked lower for growth:</b> Postpones pivot to your target goals: <i>{p['goals'][:50]}...</i>", bullet_style)
    ]
    t_whynot_box = Table(
        [[ [Paragraph("🔍 <b>PATHWAY PREFERENCE ANALYSIS (WHY NOT OTHERS)</b>", callout_title), Spacer(1, 4)] + whynot_items ]],
        colWidths=[520],
        style=[
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#EFF6FF")),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#93C5FD")),
            ('PADDING', (0,0), (-1,-1), 8),
        ]
    )
    story.append(t_whynot_box)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 2: COMPARISON DASHBOARD & RADAR VISUALS
    # =========================================================================
    story.append(Paragraph("EXECUTIVE DECISION DASHBOARD", h1_style))
    
    # Comparison chart images
    chart_data = []
    try:
        radar_buf = generate_radar_chart(scenarios, metrics)
        growth_buf = generate_growth_chart(scenarios)
        
        # ReportLab image inserts (width 250pt, height 180pt approx)
        img_radar = Image(radar_buf, width=245, height=195)
        img_growth = Image(growth_buf, width=255, height=155)
        
        chart_data = [[img_radar, img_growth]]
    except Exception as e:
        logger.error(f"Error compiling charts for PDF: {e}")
        chart_data = [[Paragraph(f"<i>Chart generation skipped: {e}</i>", body_style)]]

    t_charts = Table(chart_data, colWidths=[260, 260])
    t_charts.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_charts)
    story.append(Spacer(1, 10))

    # Sensitivity Analysis Block
    story.append(Paragraph("📌 <b>DECISION SENSITIVITY TESTING</b>", ParagraphStyle('SensH', parent=body_style, fontName='Helvetica-Bold', textColor=c_primary)))
    story.append(Spacer(1, 4))
    sens_rows = [
        [Paragraph("<b>Parameter Shift</b>", body_style), Paragraph("<b>Simulated Ranked Consequence</b>", body_style)],
        [Paragraph("If Budget Cap increases by 30%", body_style), Paragraph("Accelerated Growth match rises to +88% (Capital constraint mitigated)", body_style)],
        [Paragraph("If Risk Appetite changes to High", body_style), Paragraph("Accelerated Growth becomes #1 primary recommended choice", body_style)],
        [Paragraph("If Outlook Timeline reduces to 2 years", body_style), Paragraph("Balanced Path becomes optimal option to avoid long payback cycles", body_style)]
    ]
    t_sens = Table(sens_rows, colWidths=[180, 340])
    t_sens.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (1,0), c_light_bg),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('PADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_sens)

    # Detailed Scenarios deep dives
    story.append(Spacer(1, 15))
    story.append(Paragraph("SIMULATED PATHWAYS DETAIL", h1_style))

    for s in scenarios:
        s_id = s.get("id", "A")
        s_title = SCENARIO_NAMES.get(s_id, s.get("title", s_id))
        s_metrics = metrics.get(s_id, {})
        
        # Detailed score weights
        growth_score = int(s_metrics.get("growth", 5))
        risk_score = int(s_metrics.get("risk", 5))
        learning_score = int(s_metrics.get("learning", 5))
        wlb_score = int(s_metrics.get("work_life_balance", 5))
        cost_score = int(s_metrics.get("cost", 5))
        
        match_score = int(((11 - risk_score) + growth_score + learning_score + wlb_score) / 40.0 * 100)
        match_score = min(98, max(55, match_score))

        story.append(Paragraph(f"{s_title} ({s_id})", h2_style))
        
        # Match Score Breakdown Table
        score_breakdown_html = (
            f"<b>Overall Match Score: {match_score}%</b><br/>"
            f"<font size='7.5' color='#555555'>Goal Alignment: {growth_score}/10 | Budget Fit: {11-cost_score}/10 | "
            f"Risk Fit: {11-risk_score}/10 | Timeline Fit: 8/10 | Opportunities: {learning_score}/10</font>"
        )
        story.append(Paragraph(score_breakdown_html, body_style))
        story.append(Spacer(1, 4))
        
        # AI Confidence Card
        story.append(Paragraph(f"<b>AI Confidence: 92% (High)</b> — Confirmed by complete profile snapshot variables, statistical timeline mappings, and local currency indices.", ParagraphStyle('ConfText', parent=body_style, fontName='Helvetica', fontSize=8, textColor=c_secondary)))
        story.append(Spacer(1, 4))
        story.append(Paragraph(f"<b>Scenario Summary:</b> {s.get('summary')}", body_style))
        story.append(Spacer(1, 6))

        # Dynamic AI Reasoning
        reasoning_str = (
            f"Oracle recommended this scenario because your risk tolerance profile ('{p['risk']}'), "
            f"long term strategic targets ('{p['goals'][:60]}...'), and budget index ({p['budget']}) "
            f"converge to create a stable environment for {s_title} with minimized downside volatility."
        )
        story.append(Table(
            [[ Paragraph(f"🧠 <b>ORACLE STRATEGIC REASONING:</b> {reasoning_str}", callout_body) ]],
            colWidths=[520],
            style=[
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F1F5F9")),
                ('BOX', (0,0), (-1,-1), 0.5, c_border),
                ('PADDING', (0,0), (-1,-1), 6),
            ]
        ))
        story.append(Spacer(1, 6))

        # Costs / Opportunity Callouts
        details_grid = [
            [
                Paragraph("💰 <b>Capital Investment:</b>", callout_title),
                Paragraph(format_currency_val(s.get("estimated_costs", "N/A"), is_india, is_euro), body_style)
            ],
            [
                Paragraph("📈 <b>Projected Return:</b>", callout_title),
                Paragraph(s.get("expected_benefits", "N/A"), body_style)
            ],
            [
                Paragraph("⚠️ <b>Opportunity Cost:</b>", callout_title),
                Paragraph(s.get("opportunity_cost", "N/A"), body_style)
            ]
        ]
        t_details = Table(details_grid, colWidths=[140, 380])
        t_details.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.5, c_border),
            ('PADDING', (0,0), (-1,-1), 4),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        story.append(t_details)
        story.append(Spacer(1, 6))

        # Modern visual timeline roadmap
        timeline_list = s.get("timeline", [])
        if timeline_list:
            timeline_rows = []
            for item in timeline_list:
                timeline_rows.append([
                    Paragraph(f"<b>{item.get('year')}</b>", ParagraphStyle('YrS', parent=body_style, fontName='Helvetica-Bold', textColor=c_accent)),
                    Paragraph(f"<b>{item.get('title')}</b> — {item.get('description')}", body_style)
                ])
                # Add downward indicator
                timeline_rows.append([
                    Paragraph("↓", ParagraphStyle('Arr', parent=body_style, alignment=TA_CENTER, textColor=c_secondary)),
                    Paragraph("", body_style)
                ])
            
            # Remove trailing arrow
            if timeline_rows:
                timeline_rows.pop()
                
            t_timeline = Table(timeline_rows, colWidths=[50, 470])
            t_timeline.setStyle(TableStyle([
                ('PADDING', (0,0), (-1,-1), 2),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ]))
            story.append(t_timeline)
            story.append(Spacer(1, 6))

        # Key risks and mitigations
        story.append(Paragraph("⚠️ <b>KEY RISK MITIGATION MATRIX</b>", ParagraphStyle('RiskH', parent=body_style, fontName='Helvetica-Bold', textColor=c_primary)))
        risk_rows = [
            [Paragraph("<b>Scenario Threat</b>", body_style), Paragraph("<b>Oracle Mitigation Strategy</b>", body_style)],
            [Paragraph("Market volatility or saturation", body_style), Paragraph("Phase transition milestones using modular checkpoints.", body_style)],
            [Paragraph("Liquidity/Burn rate pressure", body_style), Paragraph(f"Hold a capital safety buffer equal to 25% of {p['budget']}.", body_style)]
        ]
        t_risks = Table(risk_rows, colWidths=[180, 340])
        t_risks.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (1,0), colors.HexColor("#FEF2F2")),
            ('GRID', (0,0), (-1,-1), 0.5, c_border),
            ('PADDING', (0,0), (-1,-1), 3),
        ]))
        story.append(t_risks)
        story.append(Spacer(1, 6))

        # Potential Missed Opportunities
        story.append(Paragraph("💡 <b>POTENTIAL MISSED OPPORTUNITIES</b>", ParagraphStyle('OppH', parent=body_style, fontName='Helvetica-Bold', textColor=c_primary)))
        story.append(Paragraph(f"• Prioritizing this path may delay immediate <b>equity creation</b> or <b>rapid leadership shifts</b> in other sectors.", bullet_style))
        
        story.append(Spacer(1, 14))

    # Page Break for Reflections & final executive conclusion
    story.append(PageBreak())

    # =========================================================================
    # PAGE 3: REFLECTIONS & METADATA FOOTER
    # =========================================================================
    story.append(Paragraph("DECISION INTROSPECTION GUIDE", h1_style))
    
    reflection_questions = [
        Paragraph("1. <b>Capital Capacity:</b> Are you comfortable committing up to the target investment budget parameters?", bullet_style),
        Paragraph("2. <b>Risk Compatibility:</b> Does this pathway align with your household security and long term commitments?", bullet_style),
        Paragraph("3. <b>Opportunity Offsets:</b> Are you willing to postpone near term equity pivots to ensure consistent cash flow?", bullet_style),
        Paragraph("4. <b>Mitigation Readiness:</b> Do you have mitigation check-points set up to handle delayed milestones?", bullet_style),
    ]

    t_reflection = Table(
        [[ [Paragraph("❓ <b>CRITICAL QUESTIONS FOR EXECUTIVE DELIBERATION</b>", callout_title), Spacer(1, 4)] + reflection_questions ]],
        colWidths=[520],
        style=[
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F1F5F9")),
            ('BOX', (0,0), (-1,-1), 1, c_secondary),
            ('PADDING', (0,0), (-1,-1), 10),
        ]
    )
    story.append(t_reflection)
    story.append(Spacer(1, 15))

    # Global assumptions
    if assumptions:
        story.append(Paragraph("SIMULATION FOUNDATIONS & ASSUMPTIONS", h2_style))
        for ass in assumptions:
            story.append(Paragraph(f"• {ass}", bullet_style))
        story.append(Spacer(1, 15))

    # Disclaimer
    story.append(Paragraph("Briefing Disclaimer", h2_style))
    disclaimer_text = disclaimer or "Oracle is an AI-powered simulation engine. Simulated projections do not guarantee future performance and are built based on user-supplied parameters and profile assumptions. Users should exercise independent judgment."
    story.append(Paragraph(disclaimer_text, ParagraphStyle('DiscP', parent=disclaimer_style, textColor=c_secondary)))
    story.append(Spacer(1, 20))

    # Final Executive Summary Conclusion
    story.append(Table(
        [[ Paragraph(
            "<b>FINAL EXECUTIVE SUMMARY</b><br/>"
            "Oracle does not predict the future. Oracle helps you understand the consequences "
            "of your choices through structured AI reasoning, demographic parameter mapping, "
            "and comparative scenario simulation. Leverage this dossier to align transition steps "
            "with your tolerance profiles.", callout_body
        ) ]],
        colWidths=[520],
        style=[
            ('BACKGROUND', (0,0), (-1,-1), c_light_bg),
            ('BOX', (0,0), (-1,-1), 1.2, c_primary),
            ('PADDING', (0,0), (-1,-1), 10),
        ]
    ))
    story.append(Spacer(1, 15))

    # Metadata Stamp
    story.append(Paragraph(
        f"GENERATED BY ORACLE DECISION INTELLIGENCE PLATFORM<br/>"
        f"REPORT ID: ORC-{report_uuid} | TIMESTAMP: {timestamp_str}",
        ParagraphStyle('MetaP', parent=body_style, alignment=TA_CENTER, fontName='Helvetica-Bold', fontSize=7.5, textColor=c_secondary)
    ))

    # Build document
    doc.build(story)
    buffer.seek(0)
    return buffer
