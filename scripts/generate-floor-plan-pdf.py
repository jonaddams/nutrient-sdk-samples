"""
Generate a layered PDF floor plan with OCG (Optional Content Groups).
Each building system is on its own toggleable layer.

Usage: python3 scripts/generate-floor-plan-pdf.py
Output: public/documents/floor-plan-layers.pdf
"""

import os
import fitz  # PyMuPDF

OUTPUT_PATH = os.path.join(
    os.path.dirname(__file__), "..", "public", "documents", "floor-plan-layers.pdf"
)

# Page setup (letter in points: 612 x 792)
PAGE_W, PAGE_H = fitz.paper_size("letter")
MARGIN = 54  # ~0.75 inch

# Floor plan bounds
PLAN_X = MARGIN + 36
PLAN_Y = MARGIN + 48  # room for title
PLAN_W = PAGE_W - 2 * PLAN_X
PLAN_H = PAGE_H - PLAN_Y - MARGIN - 36  # room for legend

# Colors
WALL_COLOR = fitz.utils.getColor("gray20")
WALL_FILL = (0.97, 0.97, 0.95)
PLUMBING_COLOR = (0.1, 0.4, 0.85)
PLUMBING_FILL = (0.84, 0.9, 1.0)
ELECTRICAL_COLOR = (0.9, 0.3, 0.1)
ELECTRICAL_FILL = (1.0, 0.92, 0.85)
HVAC_COLOR = (0.15, 0.7, 0.3)
HVAC_FILL = (0.88, 1.0, 0.9)
FURNITURE_COLOR = (0.55, 0.45, 0.35)
FURNITURE_FILL = (0.92, 0.88, 0.82)
DIM_COLOR = (0.45, 0.45, 0.45)
WHITE = (1, 1, 1)

# Room definitions (fractions: x, y, w, h). y=0 is top in fitz.
ROOMS = {
    "Living Room": (0, 0, 0.6, 0.55),
    "Kitchen": (0.6, 0, 0.4, 0.55),
    "Bedroom": (0, 0.55, 0.45, 0.45),
    "Bathroom": (0.45, 0.55, 0.25, 0.45),
    "Utility": (0.7, 0.55, 0.3, 0.45),
}


def room_rect(name):
    fx, fy, fw, fh = ROOMS[name]
    return fitz.Rect(
        PLAN_X + fx * PLAN_W,
        PLAN_Y + fy * PLAN_H,
        PLAN_X + (fx + fw) * PLAN_W,
        PLAN_Y + (fy + fh) * PLAN_H,
    )


def room_center(name):
    r = room_rect(name)
    return fitz.Point((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2)


def draw_title(page):
    """Title block - always visible (no OCG)."""
    cx = PAGE_W / 2
    page.insert_text(
        fitz.Point(cx - 140, MARGIN + 16),
        "Office Suite - Construction Floor Plan",
        fontsize=16,
        fontname="helv",
        color=WALL_COLOR,
    )
    page.insert_text(
        fitz.Point(cx - 155, MARGIN + 30),
        "Toggle layers in the PDF viewer to show/hide building systems",
        fontsize=9,
        fontname="helv",
        color=DIM_COLOR,
    )


def draw_walls(page, ocg):
    """Structure layer: walls, room labels, doors."""
    shape = page.new_shape()

    # Outer walls with fill
    plan = fitz.Rect(PLAN_X, PLAN_Y, PLAN_X + PLAN_W, PLAN_Y + PLAN_H)
    shape.draw_rect(plan)
    shape.finish(color=WALL_COLOR, fill=WALL_FILL, width=2.5, oc=ocg)

    # Interior walls
    for name in ROOMS:
        r = room_rect(name)
        shape.draw_rect(r)
        shape.finish(color=WALL_COLOR, width=1.5, oc=ocg)

    # Doors - white lines over wall boundaries
    lr = room_rect("Living Room")
    kr = room_rect("Kitchen")
    br = room_rect("Bedroom")
    btr = room_rect("Bathroom")
    ur = room_rect("Utility")

    def door_gap(p1, p2):
        shape.draw_line(p1, p2)
        shape.finish(color=WHITE, width=3.5, oc=ocg)

    # Living to kitchen
    mid_y = (lr.y0 + lr.y1) / 2
    door_gap(fitz.Point(lr.x1, mid_y - 10), fitz.Point(lr.x1, mid_y + 10))

    # Living to bedroom
    door_gap(fitz.Point(lr.x0 + lr.width * 0.3 - 10, lr.y1),
             fitz.Point(lr.x0 + lr.width * 0.3 + 10, lr.y1))

    # Bedroom to bathroom
    door_gap(fitz.Point(br.x1, br.y0 + br.height * 0.4 - 10),
             fitz.Point(br.x1, br.y0 + br.height * 0.4 + 10))

    # Kitchen to utility
    door_gap(fitz.Point(kr.x0 + kr.width * 0.4 - 10, kr.y1),
             fitz.Point(kr.x0 + kr.width * 0.4 + 10, kr.y1))

    # Front entrance
    door_gap(fitz.Point(lr.x0 + lr.width * 0.4 - 12, lr.y0),
             fitz.Point(lr.x0 + lr.width * 0.4 + 12, lr.y0))

    shape.commit()

    # Room labels (text must be inserted directly on page, not shape)
    for name in ROOMS:
        c = room_center(name)
        tw = fitz.get_text_length(name, fontname="helv", fontsize=11)
        page.insert_text(
            fitz.Point(c.x - tw / 2, c.y + 2),
            name,
            fontsize=11,
            fontname="helv",
            color=WALL_COLOR,
            oc=ocg,
        )
        # Room dimensions
        r = room_rect(name)
        w_ft = r.width / 72 * 1.5
        h_ft = r.height / 72 * 1.5
        dim_text = f"{w_ft:.0f}' x {h_ft:.0f}'"
        tw2 = fitz.get_text_length(dim_text, fontname="helv", fontsize=7)
        page.insert_text(
            fitz.Point(c.x - tw2 / 2, c.y + 13),
            dim_text,
            fontsize=7,
            fontname="helv",
            color=DIM_COLOR,
            oc=ocg,
        )


def draw_plumbing(page, ocg):
    """Plumbing layer: supply lines, fixtures."""
    shape = page.new_shape()

    btr = room_rect("Bathroom")
    kr = room_rect("Kitchen")
    ur = room_rect("Utility")

    # Main supply line along bottom
    bottom_y = PLAN_Y + PLAN_H - 6
    shape.draw_line(fitz.Point(PLAN_X - 8, bottom_y),
                    fitz.Point(PLAN_X + PLAN_W * 0.75, bottom_y))
    shape.finish(color=PLUMBING_COLOR, width=1.8, dashes="[4 2]", oc=ocg)

    # Branches
    def pipe(p1, p2):
        shape.draw_line(p1, p2)
        shape.finish(color=PLUMBING_COLOR, width=1.5, dashes="[4 2]", oc=ocg)

    # To bathroom
    pipe(fitz.Point(btr.x0 + btr.width * 0.5, bottom_y),
         fitz.Point(btr.x0 + btr.width * 0.5, btr.y0 + btr.height * 0.35))

    # To kitchen
    pipe(fitz.Point(kr.x0 + kr.width * 0.5, bottom_y),
         fitz.Point(kr.x0 + kr.width * 0.5, kr.y0 + kr.height * 0.65))
    pipe(fitz.Point(kr.x0 + kr.width * 0.5, kr.y0 + kr.height * 0.65),
         fitz.Point(kr.x0 + kr.width * 0.8, kr.y0 + kr.height * 0.65))

    # To utility
    pipe(fitz.Point(ur.x0 + ur.width * 0.4, bottom_y),
         fitz.Point(ur.x0 + ur.width * 0.4, ur.y0 + ur.height * 0.5))

    # Fixtures
    def fixture_rect(cx, cy, w, h, label):
        r = fitz.Rect(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2)
        shape.draw_rect(r)
        shape.finish(color=PLUMBING_COLOR, fill=PLUMBING_FILL, width=1, oc=ocg)
        tw = fitz.get_text_length(label, fontname="helv", fontsize=6)
        page.insert_text(fitz.Point(cx - tw / 2, cy + h / 2 + 10),
                         label, fontsize=6, fontname="helv", color=PLUMBING_COLOR, oc=ocg)

    def fixture_circle(cx, cy, r, label):
        shape.draw_circle(fitz.Point(cx, cy), r)
        shape.finish(color=PLUMBING_COLOR, fill=PLUMBING_FILL, width=1, oc=ocg)
        tw = fitz.get_text_length(label, fontname="helv", fontsize=6)
        page.insert_text(fitz.Point(cx - tw / 2, cy + r + 10),
                         label, fontsize=6, fontname="helv", color=PLUMBING_COLOR, oc=ocg)

    # Bathroom fixtures
    fixture_rect(btr.x0 + btr.width * 0.2, btr.y0 + btr.height * 0.25, 14, 18, "WC")
    fixture_circle(btr.x0 + btr.width * 0.5, btr.y0 + btr.height * 0.18, 8, "Sink")
    fixture_rect(btr.x0 + btr.width * 0.8, btr.y0 + btr.height * 0.45, 22, 30, "Shower")

    # Kitchen sink
    fixture_rect(kr.x0 + kr.width * 0.8, kr.y0 + kr.height * 0.65, 18, 12, "Sink")

    # Utility washer
    fixture_circle(ur.x0 + ur.width * 0.4, ur.y0 + ur.height * 0.5, 10, "Washer")

    shape.commit()
    _legend_item(page, 0, "Plumbing", PLUMBING_COLOR, ocg, dashed=True)


def draw_electrical(page, ocg):
    """Electrical layer: wiring, outlets, switches, lights, panel."""
    shape = page.new_shape()

    ur = room_rect("Utility")
    kr = room_rect("Kitchen")
    lr = room_rect("Living Room")
    br = room_rect("Bedroom")
    btr = room_rect("Bathroom")

    # Panel
    px, py = ur.x0 + ur.width * 0.85, ur.y0 + ur.height * 0.2
    panel_r = fitz.Rect(px - 10, py - 8, px + 10, py + 8)
    shape.draw_rect(panel_r)
    shape.finish(color=ELECTRICAL_COLOR, fill=ELECTRICAL_FILL, width=1.5, oc=ocg)
    tw = fitz.get_text_length("PANEL", fontname="helv", fontsize=6)
    page.insert_text(fitz.Point(px - tw / 2, py + 3),
                     "PANEL", fontsize=6, fontname="helv", color=ELECTRICAL_COLOR, oc=ocg)

    # Wiring runs from panel
    def wire(p1, p2):
        shape.draw_line(p1, p2)
        shape.finish(color=ELECTRICAL_COLOR, width=0.8, dashes="[2 1.5]", oc=ocg)

    wire(fitz.Point(px, py), fitz.Point(kr.x0 + kr.width * 0.5, kr.y0 + kr.height * 0.35))
    wire(fitz.Point(px, py), fitz.Point(lr.x1, lr.y1))
    wire(fitz.Point(lr.x1, lr.y1), fitz.Point(lr.x0 + lr.width * 0.5, lr.y0 + lr.height * 0.5))
    wire(fitz.Point(px, py), fitz.Point(br.x0 + br.width * 0.5, br.y0 + br.height * 0.5))
    wire(fitz.Point(px, py), fitz.Point(btr.x0 + btr.width * 0.5, btr.y0 + btr.height * 0.5))

    # Outlets
    def outlet(x, y, label=None):
        r = fitz.Rect(x - 4, y - 2.5, x + 4, y + 2.5)
        shape.draw_rect(r)
        shape.finish(color=ELECTRICAL_COLOR, fill=ELECTRICAL_FILL, width=0.7, oc=ocg)
        # Prong marks
        shape.draw_line(fitz.Point(x - 1.5, y - 1.5), fitz.Point(x - 1.5, y + 1.5))
        shape.draw_line(fitz.Point(x + 1.5, y - 1.5), fitz.Point(x + 1.5, y + 1.5))
        shape.finish(color=ELECTRICAL_COLOR, width=0.4, oc=ocg)
        if label:
            tw = fitz.get_text_length(label, fontname="helv", fontsize=5)
            page.insert_text(fitz.Point(x - tw / 2, y + 8),
                             label, fontsize=5, fontname="helv", color=ELECTRICAL_COLOR, oc=ocg)

    # Living room
    outlet(lr.x0 + 10, lr.y0 + lr.height * 0.3)
    outlet(lr.x0 + 10, lr.y0 + lr.height * 0.7)
    outlet(lr.x1 - 10, lr.y0 + lr.height * 0.5)
    outlet(lr.x0 + lr.width * 0.5, lr.y1 - 10)

    # Kitchen
    outlet(kr.x0 + 10, kr.y0 + kr.height * 0.5)
    outlet(kr.x0 + kr.width * 0.5, kr.y0 + 10)
    outlet(kr.x1 - 10, kr.y0 + kr.height * 0.5)

    # Bedroom
    outlet(br.x0 + 10, br.y0 + br.height * 0.5)
    outlet(br.x1 - 10, br.y0 + br.height * 0.5)
    outlet(br.x0 + br.width * 0.5, br.y0 + 10)

    # Bathroom GFCI
    outlet(btr.x0 + 10, btr.y0 + btr.height * 0.5, "GFCI")

    # Switches
    def switch(x, y):
        shape.draw_circle(fitz.Point(x, y), 4)
        shape.finish(color=ELECTRICAL_COLOR, fill=ELECTRICAL_FILL, width=0.6, oc=ocg)
        page.insert_text(fitz.Point(x - 2, y + 2),
                         "S", fontsize=5, fontname="helv", color=ELECTRICAL_COLOR, oc=ocg)

    switch(lr.x0 + lr.width * 0.4 + 16, lr.y0 + 10)
    switch(lr.x1 - 8, lr.y0 + lr.height * 0.5 + 14)
    switch(br.x0 + br.width * 0.3 + 14, br.y0 + 8)
    switch(btr.x0 + 8, btr.y0 + btr.height * 0.4 + 10)

    # Ceiling lights (circle with X)
    def light(x, y):
        shape.draw_circle(fitz.Point(x, y), 6)
        shape.finish(color=ELECTRICAL_COLOR, fill=(1, 0.96, 0.9), width=0.6, oc=ocg)
        shape.draw_line(fitz.Point(x - 4, y - 4), fitz.Point(x + 4, y + 4))
        shape.draw_line(fitz.Point(x - 4, y + 4), fitz.Point(x + 4, y - 4))
        shape.finish(color=ELECTRICAL_COLOR, width=0.5, oc=ocg)

    for name in ROOMS:
        c = room_center(name)
        light(c.x, c.y - 16)

    shape.commit()
    _legend_item(page, 1, "Electrical", ELECTRICAL_COLOR, ocg, dashed=True)


def draw_hvac(page, ocg):
    """HVAC layer: ducts, vents, thermostat, AC unit."""
    shape = page.new_shape()

    lr = room_rect("Living Room")
    kr = room_rect("Kitchen")
    br = room_rect("Bedroom")
    btr = room_rect("Bathroom")
    ur = room_rect("Utility")

    # Main duct across top
    duct_y = lr.y0 + 14
    shape.draw_line(fitz.Point(PLAN_X + 6, duct_y),
                    fitz.Point(PLAN_X + PLAN_W - 6, duct_y))
    shape.finish(color=HVAC_COLOR, width=2, dashes="[6 3]", oc=ocg)

    # Branches to upper rooms
    for name in ["Living Room", "Kitchen"]:
        c = room_center(name)
        shape.draw_line(fitz.Point(c.x, duct_y), fitz.Point(c.x, c.y - 20))
        shape.finish(color=HVAC_COLOR, width=1.5, dashes="[6 3]", oc=ocg)

    # Lower duct
    duct_y2 = br.y0 + 10
    shape.draw_line(fitz.Point(PLAN_X + 6, duct_y2),
                    fitz.Point(PLAN_X + PLAN_W * 0.7, duct_y2))
    shape.finish(color=HVAC_COLOR, width=2, dashes="[6 3]", oc=ocg)

    for name in ["Bedroom", "Bathroom"]:
        c = room_center(name)
        shape.draw_line(fitz.Point(c.x, duct_y2), fitz.Point(c.x, c.y - 14))
        shape.finish(color=HVAC_COLOR, width=1.5, dashes="[6 3]", oc=ocg)

    # Vents
    def vent(x, y):
        r = fitz.Rect(x - 8, y - 4, x + 8, y + 4)
        shape.draw_rect(r)
        shape.finish(color=HVAC_COLOR, fill=HVAC_FILL, width=0.6, oc=ocg)
        for i in range(3):
            lx = x - 5 + i * 5
            shape.draw_line(fitz.Point(lx, y - 3), fitz.Point(lx, y + 3))
            shape.finish(color=HVAC_COLOR, width=0.3, oc=ocg)

    for name in ["Living Room", "Kitchen", "Bedroom", "Bathroom"]:
        c = room_center(name)
        vent(c.x, c.y - 20)

    # AC unit
    acx, acy = ur.x0 + ur.width * 0.5, ur.y0 + ur.height * 0.2
    ac_r = fitz.Rect(acx - 14, acy - 10, acx + 14, acy + 10)
    shape.draw_rect(ac_r)
    shape.finish(color=HVAC_COLOR, fill=HVAC_FILL, width=1.5, oc=ocg)
    page.insert_text(fitz.Point(acx - 7, acy - 1), "A/C",
                     fontsize=6, fontname="helv", color=HVAC_COLOR, oc=ocg)
    page.insert_text(fitz.Point(acx - 8, acy + 7), "UNIT",
                     fontsize=6, fontname="helv", color=HVAC_COLOR, oc=ocg)

    # Thermostat
    thx, thy = lr.x0 + lr.width * 0.7, lr.y0 + lr.height * 0.25
    shape.draw_circle(fitz.Point(thx, thy), 6)
    shape.finish(color=HVAC_COLOR, fill=HVAC_FILL, width=0.8, oc=ocg)
    page.insert_text(fitz.Point(thx - 2.5, thy + 2.5), "T",
                     fontsize=6, fontname="helv", color=HVAC_COLOR, oc=ocg)
    tw = fitz.get_text_length("Thermo", fontname="helv", fontsize=5)
    page.insert_text(fitz.Point(thx - tw / 2, thy + 14), "Thermo",
                     fontsize=5, fontname="helv", color=HVAC_COLOR, oc=ocg)

    shape.commit()
    _legend_item(page, 2, "HVAC", HVAC_COLOR, ocg, dashed=True)


def draw_furniture(page, ocg):
    """Furniture layer: sofa, table, bed, counters."""
    shape = page.new_shape()

    lr = room_rect("Living Room")
    kr = room_rect("Kitchen")
    br = room_rect("Bedroom")

    # Living room: sofa
    sofa = fitz.Rect(lr.x0 + 16, lr.y0 + lr.height * 0.52, lr.x0 + lr.width * 0.55, lr.y0 + lr.height * 0.52 + 14)
    shape.draw_rect(sofa)
    shape.finish(color=FURNITURE_COLOR, fill=FURNITURE_FILL, width=0.6, oc=ocg)

    # Coffee table
    ct = fitz.Rect(lr.x0 + lr.width * 0.2, lr.y0 + lr.height * 0.42, lr.x0 + lr.width * 0.4, lr.y0 + lr.height * 0.42 + 8)
    shape.draw_rect(ct)
    shape.finish(color=FURNITURE_COLOR, fill=FURNITURE_FILL, width=0.6, oc=ocg)

    # Kitchen: counter along right wall
    counter = fitz.Rect(kr.x1 - 16, kr.y0 + 14, kr.x1 - 4, kr.y0 + kr.height * 0.65)
    shape.draw_rect(counter)
    shape.finish(color=FURNITURE_COLOR, fill=(0.88, 0.85, 0.8), width=0.6, oc=ocg)

    # Kitchen island
    island = fitz.Rect(kr.x0 + kr.width * 0.3, kr.y0 + kr.height * 0.42,
                       kr.x0 + kr.width * 0.6, kr.y0 + kr.height * 0.42 + 12)
    shape.draw_rect(island)
    shape.finish(color=FURNITURE_COLOR, fill=FURNITURE_FILL, width=0.6, oc=ocg)

    # Bedroom: bed
    bed = fitz.Rect(br.x0 + br.width * 0.15, br.y0 + br.height * 0.2,
                    br.x0 + br.width * 0.7, br.y0 + br.height * 0.7)
    shape.draw_rect(bed)
    shape.finish(color=FURNITURE_COLOR, fill=FURNITURE_FILL, width=0.6, oc=ocg)

    # Pillows
    p1 = fitz.Rect(br.x0 + br.width * 0.2, br.y0 + br.height * 0.22,
                   br.x0 + br.width * 0.4, br.y0 + br.height * 0.22 + 8)
    p2 = fitz.Rect(br.x0 + br.width * 0.45, br.y0 + br.height * 0.22,
                   br.x0 + br.width * 0.65, br.y0 + br.height * 0.22 + 8)
    shape.draw_rect(p1)
    shape.finish(color=FURNITURE_COLOR, fill=(0.95, 0.93, 0.9), width=0.4, oc=ocg)
    shape.draw_rect(p2)
    shape.finish(color=FURNITURE_COLOR, fill=(0.95, 0.93, 0.9), width=0.4, oc=ocg)

    shape.commit()
    _legend_item(page, 3, "Furniture", FURNITURE_COLOR, ocg)


def draw_dimensions(page, ocg):
    """Dimensions layer: overall dims, north arrow, scale."""
    shape = page.new_shape()

    # Top dimension line
    dim_y = PLAN_Y - 10
    shape.draw_line(fitz.Point(PLAN_X, dim_y), fitz.Point(PLAN_X + PLAN_W, dim_y))
    shape.finish(color=DIM_COLOR, width=0.4, oc=ocg)
    # Ticks
    shape.draw_line(fitz.Point(PLAN_X, dim_y - 3), fitz.Point(PLAN_X, dim_y + 3))
    shape.draw_line(fitz.Point(PLAN_X + PLAN_W, dim_y - 3), fitz.Point(PLAN_X + PLAN_W, dim_y + 3))
    shape.finish(color=DIM_COLOR, width=0.5, oc=ocg)

    total_w = PLAN_W / 72 * 1.5
    dim_text = f"{total_w:.0f}'-0\""
    tw = fitz.get_text_length(dim_text, fontname="helv", fontsize=7)
    page.insert_text(fitz.Point(PLAN_X + PLAN_W / 2 - tw / 2, dim_y - 4),
                     dim_text, fontsize=7, fontname="helv", color=DIM_COLOR, oc=ocg)

    # Right dimension line
    dim_x = PLAN_X + PLAN_W + 10
    shape.draw_line(fitz.Point(dim_x, PLAN_Y), fitz.Point(dim_x, PLAN_Y + PLAN_H))
    shape.finish(color=DIM_COLOR, width=0.4, oc=ocg)
    shape.draw_line(fitz.Point(dim_x - 3, PLAN_Y), fitz.Point(dim_x + 3, PLAN_Y))
    shape.draw_line(fitz.Point(dim_x - 3, PLAN_Y + PLAN_H), fitz.Point(dim_x + 3, PLAN_Y + PLAN_H))
    shape.finish(color=DIM_COLOR, width=0.5, oc=ocg)

    total_h = PLAN_H / 72 * 1.5
    h_text = f"{total_h:.0f}'-0\""
    page.insert_text(fitz.Point(dim_x + 4, PLAN_Y + PLAN_H / 2 + 3),
                     h_text, fontsize=7, fontname="helv", color=DIM_COLOR, oc=ocg,
                     rotate=270)

    # North arrow
    nax = PLAN_X + PLAN_W - 20
    nay = PLAN_Y - 22
    shape.draw_line(fitz.Point(nax, nay + 10), fitz.Point(nax, nay - 6))
    shape.finish(color=DIM_COLOR, width=1.2, oc=ocg)
    # Arrow head
    shape.draw_line(fitz.Point(nax, nay - 6), fitz.Point(nax - 3, nay - 1))
    shape.draw_line(fitz.Point(nax, nay - 6), fitz.Point(nax + 3, nay - 1))
    shape.finish(color=DIM_COLOR, width=1, oc=ocg)
    page.insert_text(fitz.Point(nax - 3, nay - 9), "N",
                     fontsize=8, fontname="helv", color=DIM_COLOR, oc=ocg)

    # Scale note
    legend_y = PLAN_Y + PLAN_H + 22
    page.insert_text(fitz.Point(PLAN_X, legend_y),
                     "Scale: Not to scale - for demonstration only",
                     fontsize=6, fontname="helv", color=DIM_COLOR, oc=ocg)

    shape.commit()
    _legend_item(page, 4, "Dimensions", DIM_COLOR, ocg)


def _legend_item(page, index, label, color, ocg, dashed=False):
    """Draw a legend entry at the bottom of the page."""
    legend_y = PLAN_Y + PLAN_H + 10
    x = PLAN_X + index * 90
    shape = page.new_shape()
    kwargs = {"color": color, "width": 1.5, "oc": ocg}
    if dashed:
        kwargs["dashes"] = "[3 1.5]"
    shape.draw_line(fitz.Point(x, legend_y), fitz.Point(x + 16, legend_y))
    shape.finish(**kwargs)
    shape.commit()
    page.insert_text(fitz.Point(x + 20, legend_y + 3),
                     label, fontsize=7, fontname="helv", color=color, oc=ocg)


def build_pdf():
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

    doc = fitz.open()
    doc.set_metadata({
        "title": "Office Suite - Construction Floor Plan",
        "author": "Nutrient SDK Samples",
        "subject": "Layered PDF with OCGs for layer management demo",
    })

    page = doc.new_page(width=PAGE_W, height=PAGE_H)

    # Create OCG layers
    structure_ocg = doc.add_ocg("Structure", on=True)
    furniture_ocg = doc.add_ocg("Furniture", on=True)
    plumbing_ocg = doc.add_ocg("Plumbing", on=True)
    electrical_ocg = doc.add_ocg("Electrical", on=True)
    hvac_ocg = doc.add_ocg("HVAC", on=True)
    dimensions_ocg = doc.add_ocg("Dimensions", on=True)

    # Draw each layer
    draw_title(page)
    draw_walls(page, structure_ocg)
    draw_furniture(page, furniture_ocg)
    draw_plumbing(page, plumbing_ocg)
    draw_electrical(page, electrical_ocg)
    draw_hvac(page, hvac_ocg)
    draw_dimensions(page, dimensions_ocg)

    doc.save(OUTPUT_PATH)
    doc.close()

    print(f"Generated: {OUTPUT_PATH}")
    print("Layers: Structure, Plumbing, Electrical, HVAC, Furniture, Dimensions")


if __name__ == "__main__":
    build_pdf()
