"""
NautiCAI - Professional PDF Inspection Report Generator
Clean layout with proper spacing, no text overlap, systematic structure.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                 TableStyle, HRFlowable, PageBreak, KeepTogether)
from reportlab.platypus import Image as RLImage
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from PIL import Image as PILImage
import io, datetime

# ── Palette ──────────────────────────────────────────────────────────────────
DARK_NAVY   = colors.HexColor('#0A1628')
NAVY_MID    = colors.HexColor('#1A3355')
TEAL        = colors.HexColor('#00B4AA')
RED         = colors.HexColor('#D62839')
RED_BG      = colors.HexColor('#FDF0F1')
AMBER       = colors.HexColor('#E07B39')
AMBER_BG    = colors.HexColor('#FEF6EE')
GREEN       = colors.HexColor('#1A8C6E')
GREEN_BG    = colors.HexColor('#EEF8F5')
GREY_BG     = colors.HexColor('#F5F7FA')
GREY_BORDER = colors.HexColor('#DDE3EC')
GREY_TEXT   = colors.HexColor('#5A6478')
WHITE       = colors.white

SEVERITY_MAP = {
    'corrosion':     ('CRITICAL', RED,   RED_BG,   '#D62839'),
    'damage':        ('CRITICAL', RED,   RED_BG,   '#D62839'),
    'free_span':     ('CRITICAL', RED,   RED_BG,   '#D62839'),
    'debris':        ('WARNING',  AMBER, AMBER_BG, '#E07B39'),
    'marine_growth': ('WARNING',  AMBER, AMBER_BG, '#E07B39'),
    'healthy':       ('NORMAL',   GREEN, GREEN_BG, '#1A8C6E'),
    'anode':         ('NORMAL',   GREEN, GREEN_BG, '#1A8C6E'),
}

PAGE_W = A4[0] - 3 * cm   # usable width


# ── Image helper ─────────────────────────────────────────────────────────────
def get_rl_image(item, max_width=PAGE_W - 1 * cm, max_height=9 * cm):
    try:
        if item.get('frame_bytes'):
            pil_img = PILImage.open(io.BytesIO(item['frame_bytes'])).convert('RGB')
        elif item.get('frame') is not None:
            pil_img = PILImage.fromarray(item['frame'][:, :, :3])
        else:
            return None
        buf = io.BytesIO()
        pil_img.save(buf, format='JPEG', quality=92)
        buf.seek(0)
        w, h  = pil_img.size
        ratio = min(max_width / w, max_height / h)
        return RLImage(buf, width=w * ratio, height=h * ratio)
    except Exception:
        return None


# ── Style factory ────────────────────────────────────────────────────────────
def make_styles():
    return {
        'hero': ParagraphStyle(
            'hero', fontSize=28, textColor=WHITE,
            alignment=TA_CENTER, fontName='Helvetica-Bold',
            leading=34, spaceAfter=0),
        'hero_sub': ParagraphStyle(
            'hero_sub', fontSize=11, textColor=TEAL,
            alignment=TA_CENTER, fontName='Helvetica',
            leading=16, spaceAfter=0),
        'hero_meta': ParagraphStyle(
            'hero_meta', fontSize=8,
            textColor=colors.HexColor('#6AAFAF'),
            alignment=TA_CENTER, fontName='Helvetica',
            leading=12),
        'section': ParagraphStyle(
            'section', fontSize=12, textColor=DARK_NAVY,
            fontName='Helvetica-Bold',
            spaceBefore=14, spaceAfter=6),
        'body': ParagraphStyle(
            'body', fontSize=9, fontName='Helvetica',
            leading=14, textColor=DARK_NAVY),
        'bold': ParagraphStyle(
            'bold', fontSize=9, fontName='Helvetica-Bold',
            leading=14, textColor=DARK_NAVY),
        'caption': ParagraphStyle(
            'caption', fontSize=8, textColor=GREY_TEXT,
            fontName='Helvetica-Oblique',
            alignment=TA_CENTER, leading=12),
        'footer': ParagraphStyle(
            'footer', fontSize=8, textColor=GREY_TEXT,
            fontName='Helvetica', alignment=TA_CENTER,
            leading=12),
        'det_hdr_left': ParagraphStyle(
            'det_hdr_left', fontSize=10, textColor=WHITE,
            fontName='Helvetica-Bold', leading=14),
        'det_hdr_right': ParagraphStyle(
            'det_hdr_right', fontSize=10, textColor=WHITE,
            fontName='Helvetica-Bold', alignment=TA_RIGHT,
            leading=14),
    }


# ── Main generator ───────────────────────────────────────────────────────────
def generate_report(
    anomaly_log,
    mission_name  = "Subsea Inspection Mission",
    operator_name = "NautiCAI Operator",
    vessel_id     = "ROV-NautiCAI-01",
    location      = "Offshore Location",
    output_path   = "nauticai_report.pdf"
):
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=1.5*cm, rightMargin=1.5*cm,
        topMargin=1.5*cm,  bottomMargin=1.5*cm
    )
    ST    = make_styles()
    story = []
    now   = datetime.datetime.now()

    # ── 1. HERO BANNER ───────────────────────────────────────────────────────
    banner_rows = [
        [Paragraph('NautiCAI', ST['hero'])],
        [Paragraph('Underwater Hazard Detection Report — Explore Safer Seas Now', ST['hero_sub'])],
        [Paragraph(
            f'{now.strftime("%d %B %Y")}  ·  {mission_name}  ·  {location}',
            ST['hero_meta']
        )],
    ]
    banner = Table(banner_rows, colWidths=[PAGE_W])
    banner.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,-1), DARK_NAVY),
        ('TOPPADDING',    (0,0), (-1, 0), 22),
        ('BOTTOMPADDING', (0,0), (-1, 0), 4),
        ('TOPPADDING',    (0,1), (-1, 1), 4),
        ('BOTTOMPADDING', (0,1), (-1, 1), 6),
        ('TOPPADDING',    (0,2), (-1, 2), 4),
        ('BOTTOMPADDING', (0,2), (-1, 2), 18),
        ('ALIGN',         (0,0), (-1,-1), 'CENTER'),
        ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
        ('LINEBELOW',     (0,-1),(-1,-1), 4, TEAL),
    ]))
    story.append(banner)
    story.append(Spacer(1, 0.6*cm))

    # ── 2. MISSION DETAILS ───────────────────────────────────────────────────
    story.append(Paragraph('Mission Details', ST['section']))
    story.append(HRFlowable(width='100%', thickness=2, color=TEAL, spaceAfter=8))

    def kv_pair(k, v):
        return [
            Paragraph(f'<b>{k}</b>', ST['body']),
            Paragraph(str(v), ST['body'])
        ]

    mission_rows = [
        kv_pair('Mission Name', mission_name)  + kv_pair('Date',      now.strftime('%Y-%m-%d')),
        kv_pair('Operator',     operator_name) + kv_pair('Time',      now.strftime('%H:%M:%S')),
        kv_pair('Vessel / ROV', vessel_id)     + kv_pair('Location',  location),
        kv_pair('AI Model',     'YOLOv8s')     + kv_pair('Framework', 'Ultralytics + Streamlit'),
    ]

    col_w = [3.2*cm, 6.3*cm, 3.2*cm, 5.3*cm]
    mission_t = Table(mission_rows, colWidths=col_w)
    mission_t.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (0,-1), GREY_BG),
        ('BACKGROUND',    (2,0), (2,-1), GREY_BG),
        ('ROWBACKGROUNDS',(0,0), (-1,-1), [WHITE, GREY_BG, WHITE, GREY_BG]),
        ('GRID',          (0,0), (-1,-1), 0.5, GREY_BORDER),
        ('TOPPADDING',    (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING',   (0,0), (-1,-1), 10),
        ('RIGHTPADDING',  (0,0), (-1,-1), 8),
        ('FONTSIZE',      (0,0), (-1,-1), 9),
        ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(mission_t)
    story.append(Spacer(1, 0.6*cm))

    # ── 3. EXECUTIVE SUMMARY ─────────────────────────────────────────────────
    story.append(Paragraph('Executive Summary', ST['section']))
    story.append(HRFlowable(width='100%', thickness=2, color=TEAL, spaceAfter=8))

    # Count by severity
    class_counts = {}
    crit = warn = norm = 0
    for item in anomaly_log:
        cls = item.get('class_name', 'unknown')
        class_counts[cls] = class_counts.get(cls, 0) + 1
        sev = SEVERITY_MAP.get(cls, ('WARNING',))[0]
        if sev == 'CRITICAL':  crit += 1
        elif sev == 'WARNING': warn += 1
        else:                  norm += 1

    def summary_cell(number, label, num_color, bg_color, border_color):
        num_style = ParagraphStyle(
            f'num_{label}', fontSize=30, fontName='Helvetica-Bold',
            textColor=num_color, alignment=TA_CENTER, leading=36)
        lbl_style = ParagraphStyle(
            f'lbl_{label}', fontSize=8, fontName='Helvetica-Bold',
            textColor=num_color, alignment=TA_CENTER, leading=12)
        return [
            Paragraph(label, lbl_style),
            Paragraph(str(number), num_style),
        ]

    quarter = PAGE_W / 4
    sum_labels = Table([[
        Paragraph('TOTAL DETECTIONS', ParagraphStyle('sl0', fontSize=8, fontName='Helvetica-Bold', textColor=DARK_NAVY, alignment=TA_CENTER)),
        Paragraph('CRITICAL',         ParagraphStyle('sl1', fontSize=8, fontName='Helvetica-Bold', textColor=RED,       alignment=TA_CENTER)),
        Paragraph('WARNINGS',         ParagraphStyle('sl2', fontSize=8, fontName='Helvetica-Bold', textColor=AMBER,     alignment=TA_CENTER)),
        Paragraph('NORMAL',           ParagraphStyle('sl3', fontSize=8, fontName='Helvetica-Bold', textColor=GREEN,     alignment=TA_CENTER)),
    ]], colWidths=[quarter]*4)
    sum_labels.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,-1), WHITE),
        ('BACKGROUND',    (1,0), (1,-1),  RED_BG),
        ('BACKGROUND',    (2,0), (2,-1),  AMBER_BG),
        ('BACKGROUND',    (3,0), (3,-1),  GREEN_BG),
        ('TOPPADDING',    (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LINEABOVE',     (0,0), (-1,0),  3, TEAL),
        ('INNERGRID',     (0,0), (-1,-1), 0.5, GREY_BORDER),
        ('BOX',           (0,0), (-1,-1), 0.5, GREY_BORDER),
        ('LINEBEFORE',    (1,0), (1,-1),  2, RED),
        ('LINEBEFORE',    (2,0), (2,-1),  2, AMBER),
        ('LINEBEFORE',    (3,0), (3,-1),  2, GREEN),
    ]))

    sum_nums = Table([[
        Paragraph(str(len(anomaly_log)), ParagraphStyle('sn0', fontSize=34, fontName='Helvetica-Bold', textColor=DARK_NAVY, alignment=TA_CENTER, leading=40)),
        Paragraph(str(crit),            ParagraphStyle('sn1', fontSize=34, fontName='Helvetica-Bold', textColor=RED,       alignment=TA_CENTER, leading=40)),
        Paragraph(str(warn),            ParagraphStyle('sn2', fontSize=34, fontName='Helvetica-Bold', textColor=AMBER,     alignment=TA_CENTER, leading=40)),
        Paragraph(str(norm),            ParagraphStyle('sn3', fontSize=34, fontName='Helvetica-Bold', textColor=GREEN,     alignment=TA_CENTER, leading=40)),
    ]], colWidths=[quarter]*4)
    sum_nums.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,-1), WHITE),
        ('BACKGROUND',    (1,0), (1,-1),  RED_BG),
        ('BACKGROUND',    (2,0), (2,-1),  AMBER_BG),
        ('BACKGROUND',    (3,0), (3,-1),  GREEN_BG),
        ('TOPPADDING',    (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 14),
        ('INNERGRID',     (0,0), (-1,-1), 0.5, GREY_BORDER),
        ('BOX',           (0,0), (-1,-1), 0.5, GREY_BORDER),
        ('LINEBELOW',     (0,-1),(-1,-1), 2, GREY_BORDER),
        ('LINEBEFORE',    (1,0), (1,-1),  2, RED),
        ('LINEBEFORE',    (2,0), (2,-1),  2, AMBER),
        ('LINEBEFORE',    (3,0), (3,-1),  2, GREEN),
    ]))

    story.append(sum_labels)
    story.append(sum_nums)
    story.append(Spacer(1, 0.6*cm))

    # ── 4. CLASS BREAKDOWN TABLE ─────────────────────────────────────────────
    if class_counts:
        story.append(Paragraph('Detection Breakdown by Class', ST['section']))
        story.append(HRFlowable(width='100%', thickness=1, color=GREY_BORDER, spaceAfter=6))

        total_det = max(len(anomaly_log), 1)

        # Header row
        hdr_row = [
            Paragraph('<b>Anomaly Class</b>', ParagraphStyle('bh0', fontSize=9, fontName='Helvetica-Bold', textColor=WHITE, leading=14)),
            Paragraph('<b>Count</b>',         ParagraphStyle('bh1', fontSize=9, fontName='Helvetica-Bold', textColor=WHITE, alignment=TA_CENTER, leading=14)),
            Paragraph('<b>Severity</b>',      ParagraphStyle('bh2', fontSize=9, fontName='Helvetica-Bold', textColor=WHITE, alignment=TA_CENTER, leading=14)),
            Paragraph('<b>Share %</b>',       ParagraphStyle('bh3', fontSize=9, fontName='Helvetica-Bold', textColor=WHITE, alignment=TA_CENTER, leading=14)),
        ]
        bd_rows = [hdr_row]

        for cls, cnt in sorted(class_counts.items(), key=lambda x: -x[1]):
            sev_label, _, _, hex_col = SEVERITY_MAP.get(cls, ('WARNING', None, None, '#E07B39'))
            bd_rows.append([
                Paragraph(cls.replace('_', ' ').title(), ST['body']),
                Paragraph(str(cnt),          ParagraphStyle(f'bc1{cls}', fontSize=9, fontName='Helvetica', alignment=TA_CENTER, leading=14)),
                Paragraph(f'<font color="{hex_col}"><b>{sev_label}</b></font>',
                          ParagraphStyle(f'bc2{cls}', fontSize=9, fontName='Helvetica-Bold', alignment=TA_CENTER, leading=14)),
                Paragraph(f'{cnt/total_det*100:.1f}%',
                          ParagraphStyle(f'bc3{cls}', fontSize=9, fontName='Helvetica', alignment=TA_CENTER, leading=14)),
            ])

        bd_col_w = [7.5*cm, 2.5*cm, 4*cm, 4*cm]
        bd_t = Table(bd_rows, colWidths=bd_col_w)
        bd_style = [
            ('BACKGROUND',    (0,0), (-1,0), NAVY_MID),
            ('TEXTCOLOR',     (0,0), (-1,0), WHITE),
            ('GRID',          (0,0), (-1,-1), 0.5, GREY_BORDER),
            ('TOPPADDING',    (0,0), (-1,-1), 9),
            ('BOTTOMPADDING', (0,0), (-1,-1), 9),
            ('LEFTPADDING',   (0,0), (-1,-1), 10),
            ('RIGHTPADDING',  (0,0), (-1,-1), 8),
            ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
        ]
        for i in range(1, len(bd_rows)):
            bg = WHITE if i % 2 == 1 else GREY_BG
            bd_style.append(('BACKGROUND', (0,i), (-1,i), bg))
        bd_t.setStyle(TableStyle(bd_style))
        story.append(bd_t)

    # ── 5. DETAILED ANOMALY LOG ───────────────────────────────────────────────
    if anomaly_log:
        story.append(PageBreak())
        story.append(Paragraph('Detailed Anomaly Log', ST['section']))
        story.append(HRFlowable(width='100%', thickness=2, color=TEAL, spaceAfter=12))

        for i, item in enumerate(anomaly_log):
            cls       = item.get('class_name', 'unknown')
            conf      = item.get('confidence', 0.0)
            timestamp = item.get('timestamp', 'N/A')
            sev_label, sev_color, sev_bg, hex_col = SEVERITY_MAP.get(
                cls, ('WARNING', AMBER, AMBER_BG, '#E07B39'))

            # -- Detection header bar (no overlap: two fixed columns)
            det_hdr = Table([[
                Paragraph(
                    f'Detection #{i+1:02d}  —  {cls.replace("_"," ").title()}',
                    ST['det_hdr_left']),
                Paragraph(sev_label, ST['det_hdr_right']),
            ]], colWidths=[PAGE_W * 0.75, PAGE_W * 0.25])
            det_hdr.setStyle(TableStyle([
                ('BACKGROUND',    (0,0), (-1,-1), sev_color),
                ('TOPPADDING',    (0,0), (-1,-1), 10),
                ('BOTTOMPADDING', (0,0), (-1,-1), 10),
                ('LEFTPADDING',   (0,0), (0, 0),  14),
                ('RIGHTPADDING',  (1,0), (1, 0),  14),
                ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
            ]))

            # -- Meta table (4 labeled columns, no overlap)
            meta_rows = [
                [
                    Paragraph('<b>Timestamp</b>', ST['body']),
                    Paragraph(str(timestamp),     ST['body']),
                    Paragraph('<b>Class</b>',     ST['body']),
                    Paragraph(cls.replace('_',' ').title(), ST['body']),
                ],
                [
                    Paragraph('<b>Confidence</b>', ST['body']),
                    Paragraph(f'{conf*100:.1f}%',  ST['body']),
                    Paragraph('<b>Severity</b>',   ST['body']),
                    Paragraph(
                        f'<font color="{hex_col}"><b>{sev_label}</b></font>',
                        ST['body']),
                ],
            ]
            meta_t = Table(meta_rows, colWidths=[3.2*cm, 6.3*cm, 3.2*cm, 5.3*cm])
            meta_t.setStyle(TableStyle([
                ('BACKGROUND',    (0,0), (0,-1), GREY_BG),
                ('BACKGROUND',    (2,0), (2,-1), GREY_BG),
                ('ROWBACKGROUNDS',(0,0), (-1,-1), [WHITE, GREY_BG]),
                ('GRID',          (0,0), (-1,-1), 0.5, GREY_BORDER),
                ('TOPPADDING',    (0,0), (-1,-1), 9),
                ('BOTTOMPADDING', (0,0), (-1,-1), 9),
                ('LEFTPADDING',   (0,0), (-1,-1), 10),
                ('RIGHTPADDING',  (0,0), (-1,-1), 8),
                ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
                ('FONTSIZE',      (0,0), (-1,-1), 9),
            ]))

            elements = [det_hdr, meta_t]

            # -- Annotated image
            rl_img = get_rl_image(item)
            if rl_img:
                img_caption = (
                    f'AI-Annotated Frame  ·  {cls.replace("_"," ").title()}'
                    f'  ·  Confidence {conf*100:.1f}%  ·  Detected at {timestamp}'
                )
                img_t = Table([
                    [rl_img],
                    [Paragraph(img_caption, ST['caption'])],
                ], colWidths=[PAGE_W])
                img_t.setStyle(TableStyle([
                    ('ALIGN',         (0,0), (-1,-1), 'CENTER'),
                    ('VALIGN',        (0,0), (0, 0),  'MIDDLE'),
                    ('BACKGROUND',    (0,0), (-1,-1), sev_bg),
                    ('TOPPADDING',    (0,0), (0, 0),  12),
                    ('BOTTOMPADDING', (0,0), (0, 0),  8),
                    ('TOPPADDING',    (0,1), (0, 1),  4),
                    ('BOTTOMPADDING', (0,1), (0, 1),  10),
                    ('BOX',           (0,0), (-1,-1), 0.5, GREY_BORDER),
                    ('LINEABOVE',     (0,0), (-1, 0), 3, sev_color),
                ]))
                elements.append(img_t)

            elements.append(Spacer(1, 0.6*cm))
            story.append(KeepTogether(elements))

    # ── 6. FOOTER ────────────────────────────────────────────────────────────
    story.append(Spacer(1, 0.3*cm))
    story.append(HRFlowable(width='100%', thickness=1, color=GREY_BORDER, spaceAfter=6))
    story.append(Paragraph(
        f'Generated by NautiCAI  ·  {now.strftime("%Y-%m-%d %H:%M:%S")}'
        f'  ·  Confidential Inspection Report  ·  www.nauticai-ai.com',
        ST['footer']
    ))

    doc.build(story)
    result = buf.getvalue()
    buf.close()
    return result


# ── Quick test (generates a sample PDF without real frames) ──────────────────
if __name__ == '__main__':
    sample_log = [
        {
            'class_name': 'marine_growth',
            'confidence': 0.685,
            'timestamp':  '11:59:21',
            'frame':      None,
            'frame_bytes': None,
        },
    ]
    pdf_bytes = generate_report(
        anomaly_log   = sample_log,
        mission_name  = "Subsea Inspection Mission",
        operator_name = "NautiCAI Operator",
        vessel_id     = "ROV-NautiCAI-01",
        location      = "Offshore Location",
        output_path   = "nauticai_report.pdf",
    )
    with open('/mnt/user-data/outputs/nauticai_report_fixed.pdf', 'wb') as f:
        f.write(pdf_bytes)
    print("PDF saved!")