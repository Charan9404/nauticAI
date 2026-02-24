from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.platypus import Image as RLImage
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from PIL import Image as PILImage
import io
import datetime
import numpy as np

DARK_NAVY   = colors.HexColor('#0A1628')
TEAL        = colors.HexColor('#00B4B4')
RED_ALERT   = colors.HexColor('#E63946')
YELLOW_WARN = colors.HexColor('#F4A261')
GREEN_OK    = colors.HexColor('#2A9D8F')
LIGHT_GREY  = colors.HexColor('#F8F9FA')
MID_GREY    = colors.HexColor('#6C757D')

SEVERITY_MAP = {
    'corrosion':     ('CRITICAL', RED_ALERT),
    'damage':        ('CRITICAL', RED_ALERT),
    'free_span':     ('CRITICAL', RED_ALERT),
    'debris':        ('WARNING',  YELLOW_WARN),
    'marine_growth': ('WARNING',  YELLOW_WARN),
    'healthy':       ('NORMAL',   GREEN_OK),
    'anode':         ('NORMAL',   GREEN_OK),
}


def numpy_to_reportlab_image(np_image, max_width=4*inch, max_height=3*inch):
    pil_img = PILImage.fromarray(np_image)
    img_buffer = io.BytesIO()
    pil_img.save(img_buffer, format='JPEG', quality=85)
    img_buffer.seek(0)
    orig_w, orig_h = pil_img.size
    ratio = min(max_width / orig_w, max_height / orig_h)
    return RLImage(img_buffer, width=orig_w * ratio, height=orig_h * ratio)


def generate_report(
    anomaly_log,
    mission_name="Subsea Inspection Mission",
    operator_name="NautiCAI Operator",
    vessel_id="ROV-001",
    location="Singapore Strait",
    output_path="nauticai_report.pdf"
):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=1.5*cm, leftMargin=1.5*cm,
        topMargin=1.5*cm, bottomMargin=1.5*cm
    )
    styles = getSampleStyleSheet()
    story  = []

    title_style = ParagraphStyle(
        'Title', parent=styles['Normal'],
        fontSize=22, textColor=colors.white,
        alignment=TA_CENTER, fontName='Helvetica-Bold'
    )
    subtitle_style = ParagraphStyle(
        'Subtitle', parent=styles['Normal'],
        fontSize=11, textColor=TEAL,
        alignment=TA_CENTER, fontName='Helvetica'
    )
    section_style = ParagraphStyle(
        'Section', parent=styles['Normal'],
        fontSize=13, textColor=DARK_NAVY,
        fontName='Helvetica-Bold', spaceBefore=12, spaceAfter=6
    )
    body_style = ParagraphStyle(
        'Body', parent=styles['Normal'],
        fontSize=9, fontName='Helvetica', spaceAfter=4
    )
    small_style = ParagraphStyle(
        'Small', parent=styles['Normal'],
        fontSize=8, textColor=MID_GREY,
        fontName='Helvetica', alignment=TA_CENTER
    )

    # Header
    header_data = [[Paragraph("NautiCAI", title_style)]]
    header_table = Table(header_data, colWidths=[18*cm])
    header_table.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,-1), DARK_NAVY),
        ('TOPPADDING',    (0,0), (-1,-1), 18),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('ALIGN',         (0,0), (-1,-1), 'CENTER'),
    ]))
    story.append(header_table)

    sub_data = [[Paragraph("Autonomous Subsea Inspection Report", subtitle_style)]]
    sub_table = Table(sub_data, colWidths=[18*cm])
    sub_table.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,-1), DARK_NAVY),
        ('BOTTOMPADDING', (0,0), (-1,-1), 18),
        ('ALIGN',         (0,0), (-1,-1), 'CENTER'),
    ]))
    story.append(sub_table)
    story.append(Spacer(1, 0.4*cm))

    # Mission Details
    story.append(Paragraph("Mission Details", section_style))
    story.append(HRFlowable(width="100%", thickness=2, color=TEAL, spaceAfter=8))
    now = datetime.datetime.now()
    mission_data = [
        ['Mission Name', mission_name,     'Date',     now.strftime('%Y-%m-%d')],
        ['Operator',     operator_name,    'Time',     now.strftime('%H:%M:%S')],
        ['Vessel / ROV', vessel_id,        'Location', location],
        ['AI Model',     'YOLOv8s',        'Framework','Ultralytics + Streamlit'],
    ]
    mt = Table(mission_data, colWidths=[3.5*cm, 5.5*cm, 3.5*cm, 5.5*cm])
    mt.setStyle(TableStyle([
        ('BACKGROUND',  (0,0),(0,-1), LIGHT_GREY),
        ('BACKGROUND',  (2,0),(2,-1), LIGHT_GREY),
        ('FONTNAME',    (0,0),(0,-1), 'Helvetica-Bold'),
        ('FONTNAME',    (2,0),(2,-1), 'Helvetica-Bold'),
        ('FONTSIZE',    (0,0),(-1,-1), 8),
        ('GRID',        (0,0),(-1,-1), 0.5, colors.HexColor('#DEE2E6')),
        ('TOPPADDING',  (0,0),(-1,-1), 6),
        ('BOTTOMPADDING',(0,0),(-1,-1), 6),
        ('LEFTPADDING', (0,0),(-1,-1), 8),
    ]))
    story.append(mt)
    story.append(Spacer(1, 0.4*cm))

    # Summary
    story.append(Paragraph("Executive Summary", section_style))
    story.append(HRFlowable(width="100%", thickness=2, color=TEAL, spaceAfter=8))

    class_counts  = {}
    critical_count = 0
    warning_count  = 0
    normal_count   = 0

    for item in anomaly_log:
        cls = item.get('class_name', 'unknown')
        class_counts[cls] = class_counts.get(cls, 0) + 1
        severity = SEVERITY_MAP.get(cls, ('WARNING', YELLOW_WARN))[0]
        if severity == 'CRITICAL':
            critical_count += 1
        elif severity == 'WARNING':
            warning_count += 1
        else:
            normal_count += 1

    summary_data = [
        ['Total Detections', 'Critical', 'Warnings', 'Normal'],
        [str(len(anomaly_log)), str(critical_count), str(warning_count), str(normal_count)]
    ]
    st = Table(summary_data, colWidths=[4.5*cm]*4)
    st.setStyle(TableStyle([
        ('BACKGROUND',    (0,0),(-1,0), DARK_NAVY),
        ('TEXTCOLOR',     (0,0),(-1,0), colors.white),
        ('FONTNAME',      (0,0),(-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',      (0,0),(-1,-1), 10),
        ('ALIGN',         (0,0),(-1,-1), 'CENTER'),
        ('BACKGROUND',    (1,1),(1,1), colors.HexColor('#FFE5E5')),
        ('BACKGROUND',    (2,1),(2,1), colors.HexColor('#FFF3CD')),
        ('BACKGROUND',    (3,1),(3,1), colors.HexColor('#D4EDDA')),
        ('FONTNAME',      (0,1),(-1,1), 'Helvetica-Bold'),
        ('FONTSIZE',      (0,1),(-1,1), 16),
        ('TEXTCOLOR',     (1,1),(1,1), RED_ALERT),
        ('TEXTCOLOR',     (2,1),(2,1), YELLOW_WARN),
        ('TEXTCOLOR',     (3,1),(3,1), GREEN_OK),
        ('GRID',          (0,0),(-1,-1), 0.5, colors.HexColor('#DEE2E6')),
        ('TOPPADDING',    (0,0),(-1,-1), 10),
        ('BOTTOMPADDING', (0,0),(-1,-1), 10),
    ]))
    story.append(st)
    story.append(Spacer(1, 0.3*cm))

    # Breakdown
    if class_counts:
        story.append(Paragraph("Detection Breakdown by Class:", body_style))
        breakdown_data = [['Anomaly Class', 'Count', 'Severity']]
        for cls, count in sorted(class_counts.items(), key=lambda x: -x[1]):
            severity_label, _ = SEVERITY_MAP.get(cls, ('WARNING', YELLOW_WARN))
            breakdown_data.append([
                cls.replace('_', ' ').title(),
                str(count),
                severity_label
            ])
        bt = Table(breakdown_data, colWidths=[7*cm, 4*cm, 7*cm])
        bt.setStyle(TableStyle([
            ('BACKGROUND',  (0,0),(-1,0), DARK_NAVY),
            ('TEXTCOLOR',   (0,0),(-1,0), colors.white),
            ('FONTNAME',    (0,0),(-1,0), 'Helvetica-Bold'),
            ('FONTSIZE',    (0,0),(-1,-1), 9),
            ('ALIGN',       (1,0),(2,-1), 'CENTER'),
            ('ROWBACKGROUNDS',(0,1),(-1,-1), [colors.white, LIGHT_GREY]),
            ('GRID',        (0,0),(-1,-1), 0.5, colors.HexColor('#DEE2E6')),
            ('TOPPADDING',  (0,0),(-1,-1), 5),
            ('BOTTOMPADDING',(0,0),(-1,-1), 5),
            ('LEFTPADDING', (0,0),(-1,-1), 8),
        ]))
        story.append(bt)

    story.append(Spacer(1, 0.4*cm))

    # Detailed Log
    if anomaly_log:
        story.append(Paragraph("Detailed Anomaly Log", section_style))
        story.append(HRFlowable(width="100%", thickness=2, color=TEAL, spaceAfter=8))

        for i, item in enumerate(anomaly_log):
            cls       = item.get('class_name', 'unknown')
            conf      = item.get('confidence', 0.0)
            timestamp = item.get('timestamp', 'N/A')
            frame     = item.get('frame', None)
            severity_label, severity_color = SEVERITY_MAP.get(cls, ('WARNING', YELLOW_WARN))

            entry_style = ParagraphStyle(
                f'entry_{i}', parent=styles['Normal'],
                fontSize=10, textColor=colors.white,
                fontName='Helvetica-Bold', leftIndent=8
            )
            row_data  = [[Paragraph(f"Detection #{i+1} — {cls.replace('_',' ').title()}", entry_style)]]
            row_table = Table(row_data, colWidths=[18*cm])
            row_table.setStyle(TableStyle([
                ('BACKGROUND',    (0,0),(-1,-1), severity_color),
                ('TOPPADDING',    (0,0),(-1,-1), 6),
                ('BOTTOMPADDING', (0,0),(-1,-1), 6),
            ]))
            story.append(row_table)

            details_text = (
                f"<b>Timestamp:</b> {timestamp}   "
                f"<b>Class:</b> {cls.replace('_',' ').title()}   "
                f"<b>Confidence:</b> {conf:.1%}   "
                f"<b>Severity:</b> {severity_label}"
            )

            if frame is not None:
                try:
                    rl_img = numpy_to_reportlab_image(frame)
                    detail_data  = [[Paragraph(details_text, body_style), rl_img]]
                    detail_table = Table(detail_data, colWidths=[9*cm, 9*cm])
                except Exception:
                    detail_data  = [[Paragraph(details_text, body_style)]]
                    detail_table = Table(detail_data, colWidths=[18*cm])
            else:
                detail_data  = [[Paragraph(details_text, body_style)]]
                detail_table = Table(detail_data, colWidths=[18*cm])

            detail_table.setStyle(TableStyle([
                ('BACKGROUND',    (0,0),(-1,-1), colors.white),
                ('GRID',          (0,0),(-1,-1), 0.5, colors.HexColor('#DEE2E6')),
                ('TOPPADDING',    (0,0),(-1,-1), 8),
                ('BOTTOMPADDING', (0,0),(-1,-1), 8),
                ('LEFTPADDING',   (0,0),(-1,-1), 8),
                ('VALIGN',        (0,0),(-1,-1), 'MIDDLE'),
            ]))
            story.append(detail_table)

    # Footer
    story.append(Spacer(1, 0.5*cm))
    story.append(HRFlowable(width="100%", thickness=1, color=MID_GREY))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph(
        f"Generated by NautiCAI | {now.strftime('%Y-%m-%d %H:%M:%S')} | www.nauticaiai.com",
        small_style
    ))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes