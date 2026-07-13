from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

def generate_decision_pdf(query: str, context: dict, simulation_data: dict) -> BytesIO:
    """
    Generates a beautifully structured PDF document summarizing the decision simulation.
    Returns a BytesIO stream containing the PDF data.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    # Primary theme colors
    primary_color = colors.HexColor("#2563EB")   # Royal Blue
    dark_bg = colors.HexColor("#09090B")         # Jet Black
    accent_blue = colors.HexColor("#3B82F6")     # Accent Blue
    gray_text = colors.HexColor("#4B5563")       # Slate Gray
    border_color = colors.HexColor("#E5E7EB")    # Light Border

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=dark_bg,
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=10,
        leading=14,
        textColor=accent_blue,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'Heading1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=primary_color,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=dark_bg,
        spaceBefore=10,
        spaceAfter=6,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#1F2937")
    )

    bullet_style = ParagraphStyle(
        'BulletText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12.5,
        leftIndent=15,
        firstLineIndent=-10,
        textColor=colors.HexColor("#1F2937"),
        spaceAfter=3
    )

    disclaimer_style = ParagraphStyle(
        'DisclaimerText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=11,
        textColor=gray_text
    )

    story = []

    # Title & Subtitle Header
    story.append(Paragraph("ORACLE", title_style))
    story.append(Paragraph("Decision Intelligence Report — Navigate Decisions. Visualize Possibilities.", subtitle_style))
    story.append(Spacer(1, 10))

    # Decision Block
    story.append(Paragraph("Primary Query", h1_style))
    query_p = Paragraph(f"<b>\"{query}\"</b>", ParagraphStyle('QueryP', parent=body_style, fontSize=12, leading=16, textColor=primary_color))
    story.append(query_p)
    story.append(Spacer(1, 10))

    # User Context Parameters Table
    story.append(Paragraph("User Configuration Parameters", h2_style))
    context_data = [
        [Paragraph("<b>Parameter</b>", body_style), Paragraph("<b>Value</b>", body_style)],
        [Paragraph("Age", body_style), Paragraph(str(context.get('age', 'N/A')), body_style)],
        [Paragraph("Current Income", body_style), Paragraph(str(context.get('current_salary', 'N/A')), body_style)],
        [Paragraph("Investment Budget", body_style), Paragraph(str(context.get('budget', 'N/A')), body_style)],
        [Paragraph("Location", body_style), Paragraph(str(context.get('country', 'N/A')), body_style)],
        [Paragraph("Career Goals", body_style), Paragraph(str(context.get('career_goals', 'N/A')), body_style)],
        [Paragraph("Risk Appetite", body_style), Paragraph(str(context.get('risk_appetite', 'N/A')).title(), body_style)],
        [Paragraph("Time Horizon", body_style), Paragraph(str(context.get('time_horizon', 'N/A')), body_style)],
    ]
    t_context = Table(context_data, colWidths=[150, 380])
    t_context.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (1,0), border_color),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('PADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_context)
    story.append(Spacer(1, 15))

    # Scenario Comparison Matrix
    scenarios = simulation_data.get("scenarios", [])
    metrics = simulation_data.get("comparison_metrics", {})
    recommendations = simulation_data.get("recommendations", {})

    story.append(Paragraph("Scenario Comparison Matrix", h1_style))
    
    # Table header
    comp_header = [
        Paragraph("<b>Scenario</b>", body_style),
        Paragraph("<b>Risk (1-10)</b>", body_style),
        Paragraph("<b>Cost (1-10)</b>", body_style),
        Paragraph("<b>Growth (1-10)</b>", body_style),
        Paragraph("<b>Learning (1-10)</b>", body_style),
        Paragraph("<b>WLB (1-10)</b>", body_style)
    ]
    comp_data = [comp_header]

    for s in scenarios:
        s_id = s.get("id", "")
        s_metrics = metrics.get(s_id, {})
        comp_row = [
            Paragraph(f"<b>{s_id}</b>: {s.get('title')}", body_style),
            Paragraph(str(s_metrics.get("risk", "N/A")), body_style),
            Paragraph(str(s_metrics.get("cost", "N/A")), body_style),
            Paragraph(str(s_metrics.get("growth", "N/A")), body_style),
            Paragraph(str(s_metrics.get("learning", "N/A")), body_style),
            Paragraph(str(s_metrics.get("work_life_balance", "N/A")), body_style),
        ]
        comp_data.append(comp_row)

    t_comp = Table(comp_data, colWidths=[200, 66, 66, 66, 66, 66])
    t_comp.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), border_color),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (1,0), (-1,-1), 'CENTER')
    ]))
    story.append(t_comp)
    story.append(Spacer(1, 15))

    # Priority Recommendations
    if recommendations:
        story.append(Paragraph("Scenario Alignment by Priority Focus", h2_style))
        rec_bullets = []
        for priority, s_id in recommendations.items():
            matched_title = next((s.get("title") for s in scenarios if s.get("id") == s_id), f"Scenario {s_id}")
            rec_bullets.append(Paragraph(f"• <b>If your priority is {priority.title()}:</b> Choose <b>Scenario {s_id}</b> ({matched_title})", bullet_style))
        for r_p in rec_bullets:
            story.append(r_p)
        story.append(Spacer(1, 15))

    story.append(PageBreak())

    # Detailed Scenarios
    story.append(Paragraph("Simulated Scenarios Deep Dive", h1_style))
    for s in scenarios:
        s_id = s.get("id", "")
        story.append(Paragraph(f"Scenario {s_id}: {s.get('title')}", h2_style))
        story.append(Paragraph(f"<b>Summary:</b> {s.get('summary')}", body_style))
        story.append(Spacer(1, 5))

        # Costs / Benefits / Opportunity Cost
        details_grid = [
            [Paragraph("<b>Estimated Financial Cost:</b>", body_style), Paragraph(s.get("estimated_costs", "N/A"), body_style)],
            [Paragraph("<b>Expected Benefits:</b>", body_style), Paragraph(s.get("expected_benefits", "N/A"), body_style)],
            [Paragraph("<b>Opportunity Cost:</b>", body_style), Paragraph(s.get("opportunity_cost", "N/A"), body_style)],
            [Paragraph("<b>Confidence Level:</b>", body_style), Paragraph(f"{s.get('confidence_level', 'N/A')}%", body_style)],
        ]
        t_details = Table(details_grid, colWidths=[150, 380])
        t_details.setStyle(TableStyle([
            ('LINEBELOW', (0,0), (-1,-1), 0.5, border_color),
            ('PADDING', (0,0), (-1,-1), 4),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        story.append(t_details)
        story.append(Spacer(1, 8))

        # Timeline
        timeline_list = s.get("timeline", [])
        if timeline_list:
            story.append(Paragraph("<b>Implementation Timeline:</b>", body_style))
            for item in timeline_list:
                story.append(Paragraph(f"• <b>{item.get('year')}:</b> {item.get('title')} — {item.get('description')}", bullet_style))
            story.append(Spacer(1, 6))

        # Pros, Cons, Risks
        story.append(Paragraph("<b>Pros:</b>", body_style))
        for pro in s.get("pros", []):
            story.append(Paragraph(f"• {pro}", bullet_style))
        story.append(Spacer(1, 4))

        story.append(Paragraph("<b>Cons:</b>", body_style))
        for con in s.get("cons", []):
            story.append(Paragraph(f"• {con}", bullet_style))
        story.append(Spacer(1, 4))

        story.append(Paragraph("<b>Risks:</b>", body_style))
        for risk in s.get("risks", []):
            story.append(Paragraph(f"• {risk}", bullet_style))
        story.append(Spacer(1, 4))

        # Next Steps
        next_steps = s.get("next_steps", [])
        if next_steps:
            story.append(Paragraph("<b>Immediate Next Steps:</b>", body_style))
            for step in next_steps:
                story.append(Paragraph(f"• {step}", bullet_style))

        # Spacing before next scenario
        story.append(Spacer(1, 20))

    # Assumptions & Disclaimer Page
    story.append(PageBreak())
    story.append(Paragraph("Simulation Foundations & Assumptions", h1_style))
    story.append(Paragraph("The simulations presented in this report are built upon these starting assumptions:", body_style))
    story.append(Spacer(1, 6))
    for ass in simulation_data.get("assumptions", []):
        story.append(Paragraph(f"• {ass}", bullet_style))
    
    story.append(Spacer(1, 20))
    story.append(Paragraph("Disclaimer", h2_style))
    story.append(Paragraph(simulation_data.get("disclaimer", "Oracle is an AI-powered simulation engine. Predictions and projections do not guarantee actual future outcomes."), disclaimer_style))

    # Build document
    doc.build(story)
    buffer.seek(0)
    return buffer
