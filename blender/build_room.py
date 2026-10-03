# Builds the listening room and exports public/models/room.glb.
# Authored in three.js coordinates (x right, y up, z toward viewer); B() maps to Blender (z up).
# Run inside Blender: node tools/blender/bridge.mjs blender/build_room.py
import bpy
import bmesh
import math
import os
from mathutils import Vector, Matrix

PROJECT = r"C:\Users\poras\Desktop\poras portfolio"
OUT = os.path.join(PROJECT, "blender", "out", "room.glb")
FONT_DIR = os.path.join(PROJECT, "node_modules", "@fontsource")
COLL = "ListeningRoom"


def B(v):
    x, y, z = v
    return Vector((x, -z, y))


# ---------------------------------------------------------------- scene reset
def reset():
    old = bpy.data.collections.get(COLL)
    if old:
        for o in list(old.all_objects):
            bpy.data.objects.remove(o, do_unlink=True)
        bpy.data.collections.remove(old)
    for block in (bpy.data.meshes, bpy.data.curves):
        for d in list(block):
            if d.users == 0:
                block.remove(d)
    for o in list(bpy.context.scene.collection.objects):
        if o.name in ("Cube",):
            bpy.data.objects.remove(o, do_unlink=True)
    c = bpy.data.collections.new(COLL)
    bpy.context.scene.collection.children.link(c)
    return c


coll = reset()


# ---------------------------------------------------------------- materials
def srgb_to_lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hexcol(h):
    h = h.lstrip("#")
    return tuple(srgb_to_lin(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4)) + (1.0,)


MATS = {}


def mat(name, color, rough=0.6, metal=0.0, emit=None, emit_strength=0.0, alpha=1.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = hexcol(color)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if emit:
        bsdf.inputs["Emission Color"].default_value = hexcol(emit)
        bsdf.inputs["Emission Strength"].default_value = emit_strength
    else:
        bsdf.inputs["Emission Strength"].default_value = 0.0
    bsdf.inputs["Alpha"].default_value = alpha
    m.diffuse_color = hexcol(color)
    MATS[name] = m
    return m


mat("wall", "#c7856a", 0.92)
mat("wall_left", "#cf8f70", 0.92)
mat("trim", "#efe2cc", 0.7)
mat("floor_a", "#b07a4f", 0.7)
mat("floor_b", "#a6704a", 0.7)
mat("floor_c", "#ba845a", 0.7)
mat("slab", "#6f4a31", 0.8)
mat("walnut", "#704431", 0.55)
mat("walnut_dark", "#4b2d20", 0.6)
mat("brass", "#c9a24e", 0.35, 0.9)
mat("silver", "#d3d1cb", 0.32, 0.85)
mat("silver_dark", "#8f8c86", 0.4, 0.8)
mat("black", "#1a1612", 0.5)
mat("rubber", "#141210", 0.9)
mat("mustard", "#d39a3a", 0.95)
mat("charcoal", "#2e2b29", 0.95)
mat("cream", "#efe4d0", 0.8)
mat("rug", "#2a5a57", 1.0)
mat("rug_border", "#e6d8bd", 1.0)
mat("terracotta", "#b5623f", 0.85)
mat("leaf", "#55834a", 0.7)
mat("leaf_dark", "#3d6638", 0.7)
mat("soil", "#3b2a20", 1.0)
mat("cork", "#c49a6c", 1.0)
mat("glass_smoke", "#2a2a2a", 0.08, alpha=0.28)
mat("screen", "#0f0c0a", 0.3, emit="#1a120b", emit_strength=1.0)
mat("vu_face", "#f3dca8", 0.6, emit="#ffbf6b", emit_strength=0.8)
mat("needle", "#b3261e", 0.5)
mat("bulb", "#fff1d6", 0.4, emit="#ffd08c", emit_strength=6.0)
mat("led", "#ffb347", 0.4, emit="#ffb347", emit_strength=3.0)
mat("text_cream", "#f3e6cf", 0.7)
mat("text_dark", "#2a211b", 0.7)
mat("curtain", "#e7d6b6", 1.0)
mat("book_red", "#b0412e", 0.8)
mat("book_blue", "#2f5d7c", 0.8)
mat("mug", "#e9e1d3", 0.35)


# ---------------------------------------------------------------- mesh helpers
def finish(name, bm, loc3=(0, 0, 0), mats=("walnut",), parent=None, bevel=0.0, seg=2, smooth=False, rot_y=0.0):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for mname in mats:
        me.materials.append(MATS[mname])
    if smooth:
        me.shade_smooth()
    o = bpy.data.objects.new(name, me)
    coll.objects.link(o)
    if parent:
        o.parent = parent
    o.location = B(loc3)
    o.rotation_euler = (0, 0, rot_y)
    if bevel > 0:
        md = o.modifiers.new("bevel", "BEVEL")
        md.width = bevel
        md.segments = seg
        md.limit_method = "ANGLE"
        md.harden_normals = False
        o.modifiers.new("wn", "WEIGHTED_NORMAL").keep_sharp = True
        me.shade_smooth()
    return o


def empty(name, loc3=(0, 0, 0), parent=None, rot_y=0.0):
    e = bpy.data.objects.new(name, None)
    coll.objects.link(e)
    if parent:
        e.parent = parent
    e.location = B(loc3)
    e.rotation_euler = (0, 0, rot_y)
    return e


def bm_box(bm, size3, center3=(0, 0, 0), mat_index=0):
    w, h, d = size3
    geom = bmesh.ops.create_cube(bm, size=1.0)
    verts = geom["verts"]
    c = B(center3)
    for v in verts:
        v.co = Vector((v.co.x * w + c.x, v.co.y * d + c.y, v.co.z * h + c.z))
    for f in {f for v in verts for f in v.link_faces}:
        f.material_index = mat_index
    return verts


def bm_cyl(bm, r1, r2, h, center3=(0, 0, 0), axis="y", segs=32, mat_index=0, cap=True):
    geom = bmesh.ops.create_cone(bm, cap_ends=cap, cap_tris=False, segments=segs, radius1=r1, radius2=r2, depth=h)
    verts = geom["verts"]
    c = B(center3)
    if axis == "z":
        rot = Matrix.Rotation(math.radians(90), 3, "X")
    elif axis == "x":
        rot = Matrix.Rotation(math.radians(90), 3, "Y")
    else:
        rot = Matrix.Identity(3)
    for v in verts:
        v.co = rot @ v.co + c
    for f in {f for v in verts for f in v.link_faces}:
        f.material_index = mat_index
    return verts


def bm_sphere(bm, r, center3=(0, 0, 0), scale3=(1, 1, 1), segs=16, rings=10, mat_index=0, rot=None):
    geom = bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=r)
    verts = geom["verts"]
    c = B(center3)
    sx, sy, sz = scale3
    for v in verts:
        p = Vector((v.co.x * sx, v.co.y * sz, v.co.z * sy))
        if rot:
            p = rot @ p
        v.co = p + c
    for f in {f for v in verts for f in v.link_faces}:
        f.material_index = mat_index
    return verts


def box(name, size3, loc3, m="walnut", parent=None, bevel=0.0, seg=2):
    bm = bmesh.new()
    bm_box(bm, size3)
    return finish(name, bm, loc3, (m,), parent, bevel, seg)


def cyl(name, r1, r2, h, loc3, m="walnut", axis="y", segs=32, parent=None, bevel=0.0, smooth=True):
    bm = bmesh.new()
    bm_cyl(bm, r1, r2, h, axis=axis, segs=segs)
    o = finish(name, bm, loc3, (m,), parent, bevel)
    if smooth and bevel == 0:
        o.data.shade_smooth()
    return o


# ---------------------------------------------------------------- text helper
def load_font(fname):
    path = os.path.join(FONT_DIR, fname)
    for f in bpy.data.fonts:
        if f.filepath == path:
            return f
    try:
        return bpy.data.fonts.load(path)
    except Exception:
        return None


FONT_BLACK = load_font(os.path.join("archivo", "files", "archivo-latin-900-normal.woff"))
FONT_NARROW = load_font(os.path.join("archivo-narrow", "files", "archivo-narrow-latin-700-normal.woff"))

FACING = {
    "+x": lambda p: Vector((p.z, p.x, p.y)),
    "+z": lambda p: Vector((p.x, -p.z, p.y)),
    "up": lambda p: Vector((p.x, p.y, p.z)),
}


def text_into(bm, body, size, center3, facing="+z", extrude=0.002, font=None, mat_index=0, align="CENTER"):
    cu = bpy.data.curves.new("tmp_txt", "FONT")
    cu.body = body
    cu.size = size
    cu.extrude = extrude
    cu.align_x = align
    cu.align_y = "CENTER"
    if font:
        cu.font = font
    tmp = bpy.data.objects.new("tmp_txt", cu)
    bpy.context.scene.collection.objects.link(tmp)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
    bpy.data.objects.remove(tmp)
    bpy.data.curves.remove(cu)
    tb = bmesh.new()
    tb.from_mesh(me)
    bpy.data.meshes.remove(me)
    c = B(center3)
    f = FACING[facing]
    for v in tb.verts:
        v.co = f(Vector((v.co.x, v.co.y, v.co.z + extrude))) + c
    for face in tb.faces:
        face.material_index = mat_index
    tmp_me = bpy.data.meshes.new("tmp_merge")
    tb.to_mesh(tmp_me)
    tb.free()
    bm.from_mesh(tmp_me)
    bpy.data.meshes.remove(tmp_me)


# ================================================================= ROOM SHELL
H, T, WH = 3.0, 0.15, 3.2
WIN = dict(x=2.08, y=1.78, w=1.2, h=1.4)
wx0, wx1 = WIN["x"] - WIN["w"] / 2, WIN["x"] + WIN["w"] / 2
wy0, wy1 = WIN["y"] - WIN["h"] / 2, WIN["y"] + WIN["h"] / 2

bm = bmesh.new()
bm_box(bm, (H * 2 + T, 0.12, H * 2 + T), (-T / 2, -0.075, -T / 2))
finish("floor_slab", bm, mats=("slab",))

bm = bmesh.new()
plank_w = 0.5
for i in range(12):
    x = -H + plank_w * (i + 0.5)
    bm_box(bm, (plank_w - 0.006, 0.02, H * 2), (x, -0.01, 0), mat_index=i % 3)
    # stagger joints
    zj = -H + ((i * 1.37) % 2.0) + 1.0
    bm_box(bm, (plank_w - 0.006, 0.021, 0.006), (x, -0.009, zj), mat_index=(i + 1) % 3)
finish("floor", bm, mats=("floor_a", "floor_b", "floor_c"))

bm = bmesh.new()
zc = -H - T / 2
bm_box(bm, (wx0 + H + T, WH + T, T), ((wx0 - H - T) / 2, (WH - T) / 2, zc))
bm_box(bm, (H - wx1, WH + T, T), ((H + wx1) / 2, (WH - T) / 2, zc))
bm_box(bm, (WIN["w"], wy0 + T, T), (WIN["x"], (wy0 - T) / 2, zc))
bm_box(bm, (WIN["w"], WH - wy1, T), (WIN["x"], (WH + wy1) / 2, zc))
finish("wall_back", bm, mats=("wall",))

bm = bmesh.new()
bm_box(bm, (T, WH + T, H * 2), (-H - T / 2, (WH - T) / 2, 0))
finish("wall_left", bm, mats=("wall_left",))

bm = bmesh.new()
bm_box(bm, (H * 2 + T, 0.04, T + 0.02), (-T / 2, WH + 0.02, zc + 0.01))
bm_box(bm, (T + 0.02, 0.04, H * 2), (-H - T / 2 + 0.01, WH + 0.02, 0))
bm_box(bm, (H * 2, 0.11, 0.02), (0, 0.055, -H + 0.01))
bm_box(bm, (0.02, 0.11, H * 2), (-H + 0.01, 0.055, 0))
finish("trim", bm, mats=("trim",))

# window casing, sill, muntins, curtains
bm = bmesh.new()
cw = 0.07
bm_box(bm, (WIN["w"] + cw * 2, cw, 0.05), (WIN["x"], wy1 + cw / 2, -H + 0.02))
bm_box(bm, (cw, WIN["h"], 0.05), (wx0 - cw / 2, WIN["y"], -H + 0.02))
bm_box(bm, (cw, WIN["h"], 0.05), (wx1 + cw / 2, WIN["y"], -H + 0.02))
bm_box(bm, (WIN["w"] + 0.3, 0.05, 0.22), (WIN["x"], wy0 - 0.025, -H + 0.08))
# reveal (inside of the wall opening)
bm_box(bm, (WIN["w"], 0.02, T), (WIN["x"], wy0 + 0.01, zc))
bm_box(bm, (WIN["w"], 0.02, T), (WIN["x"], wy1 - 0.01, zc))
bm_box(bm, (0.02, WIN["h"], T), (wx0 + 0.01, WIN["y"], zc))
bm_box(bm, (0.02, WIN["h"], T), (wx1 - 0.01, WIN["y"], zc))
# muntins (set back at the glass line)
bm_box(bm, (0.035, WIN["h"], 0.035), (WIN["x"], WIN["y"], -H - 0.1))
bm_box(bm, (WIN["w"], 0.035, 0.035), (WIN["x"], WIN["y"] + 0.1, -H - 0.1))
finish("window_frame", bm, mats=("trim",), bevel=0.006)

cyl("curtain_rod", 0.012, 0.012, WIN["w"] + 0.8, (WIN["x"], wy1 + 0.16, -H + 0.09), "brass", axis="x", segs=16)


def curtain(name, x_center, width, gathered):
    bm = bmesh.new()
    folds = 7
    res = 48
    rows = 12
    top, bottom = wy1 + 0.15, 0.3
    verts = []
    for j in range(rows + 1):
        row = []
        y = top - (top - bottom) * j / rows
        for i in range(res + 1):
            u = i / res
            x = x_center - width / 2 + width * u
            z = -H + 0.12 + 0.035 * math.sin(u * folds * 2 * math.pi) * (0.6 + 0.4 * j / rows)
            row.append(bm.verts.new(B((x, y, z))))
        verts.append(row)
    for j in range(rows):
        for i in range(res):
            bm.faces.new((verts[j][i], verts[j][i + 1], verts[j + 1][i + 1], verts[j + 1][i]))
    o = finish(name, bm, mats=("curtain",), smooth=True)
    o.modifiers.new("thick", "SOLIDIFY").thickness = 0.01
    return o


curtain("curtain_l", wx0 - 0.17, 0.28, True)
curtain("curtain_r", wx1 + 0.17, 0.28, True)

# ================================================================= RUG
bm = bmesh.new()
bm_box(bm, (3.4, 0.012, 2.4), (0.2, 0.006, -0.9))
bm_box(bm, (3.1, 0.013, 2.1), (0.2, 0.0065, -0.9), mat_index=1)
bm_box(bm, (3.0, 0.014, 2.0), (0.2, 0.007, -0.9), mat_index=0)
finish("rug", bm, mats=("rug", "rug_border"), bevel=0.004)

# ================================================================= CREDENZA
CR = dict(x=-0.45, z=-2.72, w=2.3, d=0.52, top=0.64)
cred = empty("credenza", (CR["x"], 0, CR["z"]))
bm = bmesh.new()
bm_box(bm, (CR["w"], 0.5, CR["d"]), (0, 0.39, 0))
finish("credenza_body", bm, mats=("walnut",), parent=cred, bevel=0.012, seg=3)
bm = bmesh.new()
door_w = (CR["w"] - 0.08) / 3
for i in range(3):
    x = -CR["w"] / 2 + 0.04 + door_w * (i + 0.5)
    bm_box(bm, (door_w - 0.02, 0.38, 0.015), (x, 0.39, CR["d"] / 2 + 0.003))
    for k in range(9):
        sx = x - door_w / 2 + 0.06 + k * (door_w - 0.12) / 8
        bm_box(bm, (0.012, 0.3, 0.008), (sx, 0.39, CR["d"] / 2 + 0.012), mat_index=1)
finish("credenza_doors", bm, mats=("walnut", "walnut_dark"), parent=cred, bevel=0.003)
bm = bmesh.new()
for i in range(3):
    x = -CR["w"] / 2 + 0.04 + door_w * (i + 0.5)
    bm_cyl(bm, 0.012, 0.012, 0.03, (x + door_w / 2 - 0.05, 0.39, CR["d"] / 2 + 0.025), axis="z", segs=16)
finish("credenza_pulls", bm, mats=("brass",), parent=cred, smooth=True)
bm = bmesh.new()
for sx in (-1, 1):
    for sz in (-1, 1):
        bm_cyl(bm, 0.018, 0.026, 0.14, (sx * (CR["w"] / 2 - 0.12), 0.07, sz * (CR["d"] / 2 - 0.08)), segs=16)
finish("credenza_legs", bm, mats=("walnut_dark",), parent=cred, smooth=True)

TOP = CR["top"]

# ================================================================= TURNTABLE
TT = dict(x=-1.05, z=-2.72, w=0.46, d=0.36, h=0.09)
tt = empty("turntable", (TT["x"], TOP, TT["z"]))
bm = bmesh.new()
bm_box(bm, (TT["w"], 0.075, TT["d"]), (0, 0.015 + 0.0375, 0))
bm_box(bm, (TT["w"] - 0.02, 0.004, TT["d"] - 0.02), (0, 0.09, 0), mat_index=1)
for sx in (-1, 1):
    for sz in (-1, 1):
        bm_cyl(bm, 0.022, 0.018, 0.015, (sx * (TT["w"] / 2 - 0.05), 0.0075, sz * (TT["d"] / 2 - 0.05)), segs=20, mat_index=2)
text_into(bm, "START · STOP", 0.0095, (-0.19, 0.092, 0.105), "up", 0.0003, FONT_NARROW, 3)
text_into(bm, "33", 0.009, (-0.13, 0.092, 0.115), "up", 0.0003, FONT_NARROW, 3)
text_into(bm, "45", 0.009, (-0.1, 0.092, 0.115), "up", 0.0003, FONT_NARROW, 3)
text_into(bm, "PN·1", 0.016, (0.165, 0.092, 0.15), "up", 0.0004, FONT_BLACK, 3)
finish("tt_plinth", bm, mats=("walnut", "black", "silver_dark", "text_cream"), parent=tt, bevel=0.004)

PL = (-0.06, TT["h"], 0.02)
bm = bmesh.new()
bm_cyl(bm, 0.152, 0.152, 0.022, (0, 0.011, 0), segs=96)
bm_cyl(bm, 0.147, 0.147, 0.004, (0, 0.024, 0), segs=96, mat_index=1)
bm_cyl(bm, 0.004, 0.003, 0.02, (0, 0.03, 0), segs=12, mat_index=0)
finish("tt_platter", bm, PL, ("silver", "rubber"), parent=tt, smooth=True)

ARM_PIVOT = (0.17, TT["h"], -0.12)
bm = bmesh.new()
bm_cyl(bm, 0.028, 0.03, 0.012, (0.17, TT["h"] + 0.006, -0.12), segs=32)
bm_cyl(bm, 0.012, 0.012, 0.04, (0.17, TT["h"] + 0.03, -0.12), segs=20, mat_index=1)
bm_cyl(bm, 0.004, 0.004, 0.05, (0.19, TT["h"] + 0.025, 0.045), segs=10, mat_index=1)
bm_box(bm, (0.014, 0.006, 0.012), (0.19, TT["h"] + 0.051, 0.045), mat_index=1)
finish("tt_arm_base", bm, mats=("black", "silver"), parent=tt, smooth=True)

bm = bmesh.new()
ah = 0.052
bm_cyl(bm, 0.0045, 0.0045, 0.21, (0, ah, 0.105), axis="z", segs=12)
bm_box(bm, (0.016, 0.006, 0.034), (0, ah - 0.006, 0.222), mat_index=1)
bm_box(bm, (0.008, 0.01, 0.01), (0, ah - 0.014, 0.226), mat_index=2)
bm_cyl(bm, 0.015, 0.015, 0.03, (0, ah, -0.045), axis="z", segs=24, mat_index=1)
bm_cyl(bm, 0.009, 0.009, 0.02, (0, ah, 0), axis="x", segs=16, mat_index=1)
arm = finish("tt_arm", bm, ARM_PIVOT, ("silver", "black", "needle"), parent=tt, smooth=True)

LID_HINGE = (0, TT["h"], -TT["d"] / 2)
bm = bmesh.new()
verts = bm_box(bm, (TT["w"] + 0.006, 0.075, TT["d"] + 0.006), (0, 0.0375, TT["d"] / 2))
bottom = [f for f in bm.faces if all(abs(v.co.z - B((0, 0, 0)).z) < 1e-6 for v in f.verts)]
bmesh.ops.delete(bm, geom=bottom, context="FACES_ONLY")
lid = finish("tt_lid", bm, LID_HINGE, ("glass_smoke",), parent=tt)
lid.modifiers.new("thick", "SOLIDIFY").thickness = 0.003

cyl("tt_btn_start", 0.017, 0.017, 0.008, (-0.19, TT["h"] + 0.004, 0.14), "silver", parent=tt, segs=32)
cyl("tt_btn_33", 0.009, 0.009, 0.006, (-0.13, TT["h"] + 0.003, 0.14), "silver", parent=tt, segs=24)
cyl("tt_btn_45", 0.009, 0.009, 0.006, (-0.1, TT["h"] + 0.003, 0.14), "silver", parent=tt, segs=24)

# ================================================================= RECEIVER
RX = dict(x=-0.18, z=-2.74, w=0.62, h=0.26, d=0.36)
FACE_Z = RX["z"] + RX["d"] / 2
rx = empty("receiver", (RX["x"], TOP, RX["z"]))
bm = bmesh.new()
bm_box(bm, (RX["w"], RX["h"] - 0.012, RX["d"] - 0.012), (0, 0.012 + (RX["h"] - 0.012) / 2, -0.006))
for sx in (-1, 1):
    for sz in (-1, 1):
        bm_cyl(bm, 0.02, 0.02, 0.012, (sx * (RX["w"] / 2 - 0.05), 0.006, sz * (RX["d"] / 2 - 0.05)), segs=16, mat_index=1)
finish("rx_body", bm, mats=("walnut", "black"), parent=rx, bevel=0.008, seg=3)

FC = RX["h"] / 2 + 0.006
fz = RX["d"] / 2 - 0.006
bm = bmesh.new()
bm_box(bm, (RX["w"] - 0.03, RX["h"] - 0.03, 0.012), (0, FC, fz))
bm_box(bm, (0.38, 0.22, 0.004), (-0.11, FC, fz + 0.006), mat_index=1)
for vx in (0.145, 0.245):
    bm_box(bm, (0.095, 0.07, 0.004), (vx, FC + 0.075, fz + 0.006), mat_index=1)
text_into(bm, "PN-1 STEREO RECEIVER", 0.0085, (-0.29, FC - 0.117, fz + 0.006), "+z", 0.0004, FONT_NARROW, 2, align="LEFT")
text_into(bm, "INPUT", 0.0065, (0.145, FC - 0.095, fz + 0.006), "+z", 0.0003, FONT_NARROW, 2)
text_into(bm, "VOLUME", 0.0065, (0.245, FC - 0.095, fz + 0.006), "+z", 0.0003, FONT_NARROW, 2)
text_into(bm, "POWER", 0.0065, (0.205, FC - 0.117, fz + 0.006), "+z", 0.0003, FONT_NARROW, 2)
for i, lab in enumerate(["PHONO", "TUNER", "AUX", "TAPE"]):
    a = math.radians(-60 + 40 * i)
    r = 0.05
    text_into(bm, lab, 0.0058, (0.145 + math.sin(a) * r, FC - 0.035 + math.cos(a) * r, fz + 0.006), "+z", 0.0003, FONT_NARROW, 2)
finish("rx_face", bm, mats=("silver", "black", "text_dark"), parent=rx, bevel=0.002)

FACE_FRONT = fz + 0.006 + 0.002
bm = bmesh.new()
bm_box(bm, (0.36, 0.2, 0.002), (0, 0, 0))
finish("rx_screen", bm, (-0.11, FC, FACE_FRONT + 0.001), ("screen",), parent=rx)

bm = bmesh.new()
for vx in (0.145, 0.245):
    bm_box(bm, (0.085, 0.06, 0.002), (vx, FC + 0.075, FACE_FRONT + 0.001))
    for k in range(7):
        a = math.radians(-50 + k * (100 / 6))
        bm_box(bm, (0.0012, 0.006, 0.001), (vx + math.sin(a) * 0.036, FC + 0.052 + math.cos(a) * 0.036, FACE_FRONT + 0.0025), mat_index=1)
finish("rx_vu", bm, mats=("vu_face", "text_dark"), parent=rx)
for nm, vx in (("rx_vu_l_needle", 0.145), ("rx_vu_r_needle", 0.245)):
    bm = bmesh.new()
    bm_box(bm, (0.0012, 0.04, 0.001), (0, 0.02, 0))
    finish(nm, bm, (vx, FC + 0.05, FACE_FRONT + 0.003), ("needle",), parent=rx)


def knob(name, x, y):
    bm = bmesh.new()
    bm_cyl(bm, 0.031, 0.033, 0.026, (0, 0, 0.013), axis="z", segs=48)
    bm_cyl(bm, 0.027, 0.029, 0.004, (0, 0, 0.028), axis="z", segs=48, mat_index=1)
    bm_box(bm, (0.003, 0.018, 0.002), (0, 0.014, 0.031), mat_index=2)
    return finish(name, bm, (x, y, FACE_FRONT), ("silver", "silver_dark", "black"), parent=rx, smooth=True)


knob("rx_knob_input", 0.145, FC - 0.035)
knob("rx_knob_volume", 0.245, FC - 0.035)
cyl("rx_btn_power", 0.009, 0.009, 0.01, (0.27, FC - 0.117, FACE_FRONT + 0.005), "silver", axis="z", parent=rx, segs=24)
cyl("rx_led", 0.003, 0.003, 0.003, (0.245, FC - 0.117, FACE_FRONT + 0.0015), "led", axis="z", parent=rx, segs=12)

# ================================================================= SPEAKERS
for side, sx in (("l", -1.85), ("r", 0.95)):
    sp = empty(f"speaker_{side}", (sx, 0, -2.78))
    bm = bmesh.new()
    bm_box(bm, (0.34, 0.92, 0.32), (0, 0.08 + 0.46, 0))
    finish(f"spk_{side}_cabinet", bm, mats=("walnut",), parent=sp, bevel=0.012, seg=3)
    bm = bmesh.new()
    bm_box(bm, (0.3, 0.86, 0.01), (0, 0.08 + 0.46, 0.161))
    for px in (-0.12, 0.12):
        for pz in (-0.1, 0.1):
            bm_cyl(bm, 0.012, 0.016, 0.08, (px, 0.04, pz), segs=12, mat_index=1)
    finish(f"spk_{side}_baffle", bm, mats=("charcoal", "walnut_dark"), parent=sp, bevel=0.003)
    bm = bmesh.new()
    bm_cyl(bm, 0.105, 0.105, 0.012, (0, 0, 0.006), axis="z", segs=48, mat_index=1)
    bm_cyl(bm, 0.095, 0.05, 0.03, (0, 0, 0.014), axis="z", segs=48)
    bm_sphere(bm, 0.03, (0, 0, 0.03), (1, 1, 0.5), segs=20, rings=10, mat_index=2)
    finish(f"spk_{side}_woofer", bm, (0, 0.38, 0.166), ("black", "silver_dark", "silver"), parent=sp, smooth=True)
    bm = bmesh.new()
    bm_cyl(bm, 0.04, 0.04, 0.01, (0, 0, 0.005), axis="z", segs=32, mat_index=1)
    bm_sphere(bm, 0.018, (0, 0, 0.01), (1, 1, 0.6), segs=16, rings=8)
    finish(f"spk_{side}_tweeter", bm, (0, 0.74, 0.166), ("black", "silver_dark"), parent=sp, smooth=True)

# ================================================================= LEDGES
for i, y in enumerate((1.2, 1.76)):
    bm = bmesh.new()
    bm_box(bm, (2.4, 0.025, 0.09), (0, -0.0125, 0.045))
    bm_box(bm, (2.4, 0.03, 0.012), (0, 0.006, 0.084))
    finish(f"ledge_{i}", bm, (-0.45, y, -H), ("walnut",), bevel=0.003)

# ================================================================= SIGNS (left wall)
for nm, label, y in (("sign_records", "Records", 2.05), ("sign_about", "About me", 1.65), ("sign_notes", "Guestbook", 1.25)):
    bm = bmesh.new()
    bm_box(bm, (0.035, 0.16, 0.52), (0.0175, 0, 0))
    text_into(bm, label, 0.075, (0.035, -0.004, 0), "+x", 0.006, FONT_BLACK, 1)
    finish(nm, bm, (-H, y, 0.75), ("walnut", "text_cream"), bevel=0.006)
bm = bmesh.new()
bm_box(bm, (0.012, 0.018, 0.4), (0.006, 0, 0))
finish("sign_rail", bm, (-H, 2.2, 0.75), ("brass",))

# ================================================================= CORKBOARD
bm = bmesh.new()
bm_box(bm, (0.04, 1.0, 1.5), (0.02, 0, 0))
bm_box(bm, (0.012, 0.9, 1.4), (0.046, 0, 0), mat_index=1)
finish("board", bm, (-H, 1.72, -1.25), ("walnut", "cork"), bevel=0.006)

# ================================================================= CLOCK
clk = empty("clock", (WIN["x"], 2.86, -H))
bm = bmesh.new()
bm_cyl(bm, 0.175, 0.175, 0.04, (0, 0, 0.02), axis="z", segs=64)
bm_cyl(bm, 0.155, 0.155, 0.004, (0, 0, 0.041), axis="z", segs=64, mat_index=1)
for k in range(12):
    a = k * math.pi / 6
    l = 0.026 if k % 3 == 0 else 0.014
    rr = 0.13
    v = bm_box(bm, (0.006 if k % 3 == 0 else 0.004, l, 0.002), (0, 0, 0), mat_index=2)
    rot = Matrix.Rotation(-a, 3, "Y")
    for vv in v:
        vv.co = rot @ (vv.co + Vector((0, 0, rr))) + B((0, 0, 0.044))
finish("clock_body", bm, mats=("walnut", "cream", "text_dark"), parent=clk, smooth=False, bevel=0.004)
for nm, ln, wd in (("clock_hour", 0.085, 0.009), ("clock_min", 0.125, 0.006)):
    bm = bmesh.new()
    bm_box(bm, (wd, ln, 0.002), (0, ln / 2 - 0.015, 0))
    finish(nm, bm, (0, 0, 0.047 if nm == "clock_hour" else 0.05), ("text_dark",), parent=clk)
cyl("clock_cap", 0.008, 0.008, 0.006, (0, 0, 0.053), "brass", axis="z", parent=clk, segs=16)

# ================================================================= ARMCHAIR
chair = empty("armchair", (1.3, 0, -0.45), rot_y=math.atan2(-1.75, -2.25))
bm = bmesh.new()
for sx in (-1, 1):
    bm_box(bm, (0.05, 0.05, 0.78), (sx * 0.37, 0.56, 0.02))
    bm_cyl(bm, 0.022, 0.016, 0.42, (sx * 0.37, 0.21, 0.32), segs=12)
    bm_cyl(bm, 0.022, 0.016, 0.42, (sx * 0.37, 0.21, -0.3), segs=12)
    bm_box(bm, (0.045, 0.62, 0.05), (sx * 0.33, 0.62, -0.36))
bm_box(bm, (0.72, 0.05, 0.62), (0, 0.32, 0.02))
finish("chair_frame", bm, mats=("walnut",), parent=chair, bevel=0.01)
bm = bmesh.new()
bm_box(bm, (0.62, 0.14, 0.62), (0, 0.42, 0.04))
finish("chair_seat", bm, mats=("mustard",), parent=chair, bevel=0.05, seg=4)
bm = bmesh.new()
bm_box(bm, (0.62, 0.56, 0.13), (0, 0.78, -0.3))
finish("chair_back", bm, mats=("mustard",), parent=chair, bevel=0.05, seg=4)
bm = bmesh.new()
bm_box(bm, (0.5, 0.26, 0.11), (0, 0.6, -0.2))
finish("chair_pillow", bm, mats=("cream",), parent=chair, bevel=0.045, seg=4)

# ================================================================= LAMP
LAMP = (2.35, 0, -1.35)
lamp = empty("lamp", LAMP)
bm = bmesh.new()
bm_cyl(bm, 0.16, 0.17, 0.025, (0, 0.0125, 0), segs=40)
bm_cyl(bm, 0.012, 0.012, 1.42, (0, 0.73, 0), segs=16, mat_index=1)
bm_cyl(bm, 0.045, 0.03, 0.06, (0, 1.45, 0), segs=24, mat_index=1)
finish("lamp_stand", bm, mats=("black", "brass"), parent=lamp, smooth=True)
bm = bmesh.new()
bm_cyl(bm, 0.25, 0.15, 0.27, (0, 1.53, 0), segs=48, cap=False)
shade = finish("lamp_shade", bm, mats=("cream",), parent=lamp, smooth=True)
shade.modifiers.new("thick", "SOLIDIFY").thickness = 0.006
bm = bmesh.new()
bm_sphere(bm, 0.055, (0, 1.47, 0), segs=20, rings=12)
finish("lamp_bulb", bm, mats=("bulb",), parent=lamp, smooth=True)

# ================================================================= PLANTS & PROPS
def plant(name, loc3, pot_r, pot_h, leaves, leaf_len, height, seed):
    import random
    rnd = random.Random(seed)
    root = empty(name, loc3)
    bm = bmesh.new()
    bm_cyl(bm, pot_r * 0.8, pot_r, pot_h, (0, pot_h / 2, 0), segs=40)
    bm_cyl(bm, pot_r * 1.06, pot_r * 1.06, pot_h * 0.14, (0, pot_h * 0.93, 0), segs=40)
    bm_cyl(bm, pot_r * 0.95, pot_r * 0.95, 0.01, (0, pot_h * 0.94, 0), segs=40, mat_index=1)
    finish(f"{name}_pot", bm, mats=("terracotta", "soil"), parent=root, smooth=True)
    bm = bmesh.new()
    for k in range(leaves):
        a = k * 2.399 + rnd.random() * 0.4
        tilt = 0.5 + rnd.random() * 0.7
        h = pot_h + height * (0.35 + rnd.random() * 0.65)
        L = leaf_len * (0.7 + rnd.random() * 0.5)
        dirv = Vector((math.cos(a), 0, math.sin(a)))
        tip = Vector((0, h, 0)) + dirv * (L * math.sin(tilt) * 0.9)
        # stem
        base = Vector((0, pot_h, 0))
        mid = (base + tip) / 2
        stem_len = (tip - base).length
        sv = bm_cyl(bm, 0.006, 0.004, stem_len, (0, 0, 0), segs=6, mat_index=1)
        up = (tip - base).normalized()
        rot = Vector((0, 0, 1)).rotation_difference(B(up) - B((0, 0, 0)))
        for v in sv:
            v.co = rot @ v.co + B(mid)
        leaf_rot = Matrix.Rotation(-a, 3, "Z") @ Matrix.Rotation(tilt - 1.2, 3, "Y")
        bm_sphere(bm, 1.0, tuple(tip + dirv * L * 0.35), (L * 0.55, 0.012, L * 0.3), segs=14, rings=8, mat_index=0 if k % 2 else 2, rot=leaf_rot)
    o = finish(f"{name}_leaves", bm, mats=("leaf", "leaf_dark", "leaf_dark"), parent=root, smooth=True)
    return root


plant("plant_big", (-2.5, 0, -2.45), 0.2, 0.42, 11, 0.42, 1.0, 3)
plant("plant_small", (0.52, TOP, -2.78), 0.07, 0.12, 7, 0.12, 0.18, 8)

bm = bmesh.new()
bm_box(bm, (0.22, 0.035, 0.16), (0, 0.0175, 0))
bm_box(bm, (0.2, 0.03, 0.15), (0.005, 0.05, 0.003), mat_index=1)
finish("books", bm, (0.27, TOP, -2.62), ("book_red", "book_blue"), bevel=0.003, rot_y=0.15)
bm = bmesh.new()
bm_cyl(bm, 0.035, 0.035, 0.085, (0, 0.0425, 0), segs=32)
for k in range(9):
    a = math.pi * (k / 8) - math.pi / 2
    bm_box(bm, (0.012, 0.012, 0.012), (0.035 + 0.022 * math.cos(a), 0.045 + 0.024 * math.sin(a), 0))
finish("mug", bm, (0.27, TOP + 0.065, -2.62), ("mug",), smooth=True, rot_y=-0.6)

# ================================================================= STRING LIGHTS (back + left wall)
mat("fairy", "#fff1d0", 0.4, emit="#ffc46b", emit_strength=4.0)
mat("wire", "#2a221c", 0.8)


def string_lights(name, p0, p1, n, sag):
    bmw = bmesh.new()
    bmb = bmesh.new()
    pts = []
    steps = 60
    for i in range(steps + 1):
        t = i / steps
        p = Vector(p0).lerp(Vector(p1), t)
        p.y -= sag * 4 * t * (1 - t) * (0.6 + 0.4 * math.sin(t * math.pi * 5) ** 2)
        pts.append(p)
    for a, b in zip(pts[:-1], pts[1:]):
        mid = (a + b) / 2
        d = b - a
        v = bm_cyl(bmw, 0.003, 0.003, d.length, (0, 0, 0), segs=5)
        rot = Vector((0, 0, 1)).rotation_difference(B(d) - B((0, 0, 0)))
        for vv in v:
            vv.co = rot @ vv.co + B(mid)
    for k in range(n):
        p = pts[int((k + 0.5) / n * steps)]
        bm_sphere(bmb, 0.022, (p.x, p.y - 0.03, p.z), (1, 1.3, 1), segs=10, rings=6)
        bm_cyl(bmw, 0.008, 0.008, 0.02, (p.x, p.y - 0.008, p.z), segs=8)
    finish(name + "_wire", bmw, mats=("wire",), smooth=True)
    finish(name, bmb, mats=("fairy",), smooth=True)


string_lights("fairy_back", (-2.9, 3.0, -H + 0.04), (WIN["x"] - 0.75, 3.0, -H + 0.04), 16, 0.22)
string_lights("fairy_left", (-H + 0.04, 3.0, -2.9), (-H + 0.04, 3.0, 1.6), 14, 0.2)

# ================================================================= NAME POSTER
mat("poster", "#efe4d0", 0.9)
mat("poster_ink", "#2a211b", 0.8)
mat("poster_sun", "#e4572e", 0.8)
bm = bmesh.new()
bm_box(bm, (0.96, 0.66, 0.03), (0, 0, 0.015))
bm_box(bm, (0.88, 0.58, 0.004), (0, 0, 0.032), mat_index=1)
bm_cyl(bm, 0.1, 0.1, 0.003, (0.27, 0.12, 0.035), axis="z", segs=48, mat_index=3)
for k in range(4):
    bm_box(bm, (0.36 - k * 0.07, 0.008, 0.002), (0.27, 0.03 - k * 0.022, 0.0355), mat_index=3)
text_into(bm, "PORAS", 0.105, (-0.4, 0.15, 0.034), "+z", 0.002, FONT_BLACK, 2, align="LEFT")
text_into(bm, "NAGAR", 0.105, (-0.4, 0.04, 0.034), "+z", 0.002, FONT_BLACK, 2, align="LEFT")
text_into(bm, "AI engineer · full-stack developer", 0.032, (-0.4, -0.1, 0.034), "+z", 0.001, FONT_NARROW, 2, align="LEFT")
text_into(bm, "Live from Noida, India", 0.032, (-0.4, -0.15, 0.034), "+z", 0.001, FONT_NARROW, 2, align="LEFT")
text_into(bm, "Put a record on.", 0.026, (-0.4, -0.22, 0.034), "+z", 0.001, FONT_NARROW, 3, align="LEFT")
finish("poster", bm, (-0.45, 2.56, -H), ("walnut_dark", "poster", "poster_ink", "poster_sun"), bevel=0.004)

# ================================================================= RECORD CRATE
import random
rr = random.Random(5)
crate_cols = ["#e4572e", "#1f2a44", "#f4c95d", "#3a86a8", "#2d6a4f", "#d2452f", "#efe4d0", "#8a5a44"]
for i, c in enumerate(crate_cols):
    mat(f"crate_sleeve_{i}", c, 0.8)
bm = bmesh.new()
bm_box(bm, (0.42, 0.02, 0.36), (0, 0.01, 0))
bm_box(bm, (0.02, 0.28, 0.36), (-0.2, 0.14, 0))
bm_box(bm, (0.02, 0.28, 0.36), (0.2, 0.14, 0))
bm_box(bm, (0.42, 0.18, 0.02), (0, 0.09, 0.17))
bm_box(bm, (0.42, 0.18, 0.02), (0, 0.09, -0.17))
crate = finish("crate", bm, (-2.3, 0, -1.55), ("walnut",), bevel=0.004, rot_y=0.5)
bm = bmesh.new()
for k in range(9):
    lean = (k - 4) * 0.035
    v = bm_box(bm, (0.31, 0.31, 0.006), (0, 0, 0), mat_index=k % len(crate_cols))
    rot = Matrix.Rotation(lean, 3, "X")
    for vv in v:
        vv.co = rot @ vv.co + B((0, 0.17, -0.13 + k * 0.032))
finish("crate_sleeves", bm, mats=tuple(f"crate_sleeve_{i}" for i in range(len(crate_cols))), parent=crate)

# ================================================================= SIDE TABLE + HEADPHONES
st = empty("side_table", (2.0, 0, 0.1))
bm = bmesh.new()
bm_cyl(bm, 0.22, 0.22, 0.03, (0, 0.5, 0), segs=48)
bm_cyl(bm, 0.025, 0.025, 0.48, (0, 0.25, 0), segs=16, mat_index=1)
bm_cyl(bm, 0.14, 0.15, 0.02, (0, 0.01, 0), segs=40, mat_index=1)
finish("side_table_body", bm, mats=("walnut", "black"), parent=st, smooth=True)
bm = bmesh.new()
for k in range(15):
    a = math.pi * k / 14
    bm_box(bm, (0.02, 0.014, 0.03), (0.09 * math.cos(a), 0.52 + 0.012 + 0.09 * math.sin(a) * 0.35, 0.0))
for sx in (-1, 1):
    bm_cyl(bm, 0.045, 0.045, 0.035, (sx * 0.09, 0.535, 0), axis="x", segs=24, mat_index=1)
finish("headphones", bm, mats=("black", "mustard"), parent=st, smooth=True, rot_y=0.7)

# ================================================================= POUF
bm = bmesh.new()
bm_cyl(bm, 0.28, 0.28, 0.3, (0, 0.15, 0), segs=40)
finish("pouf", bm, (-0.35, 0, -0.55), ("cream",), bevel=0.08, seg=4)

# ================================================================= BAKE AMBIENT OCCLUSION INTO VERTEX COLOURS
# Runtime SSAO is too slow on integrated GPUs; baked AO gives the same soft corners for free.
NO_AO = {"fairy_back", "fairy_left", "lamp_bulb", "rx_screen", "rx_vu", "rx_led", "tt_lid", "rx_vu_l_needle", "rx_vu_r_needle"}
DENSIFY = {"floor": 0.14, "floor_slab": 0.3, "wall_back": 0.14, "wall_left": 0.14, "rug": 0.12, "trim": 0.2,
           "credenza_body": 0.1, "ledge_0": 0.1, "ledge_1": 0.1, "board": 0.12, "spk_l_cabinet": 0.1, "spk_r_cabinet": 0.1,
           "window_frame": 0.12, "poster": 0.12, "rx_body": 0.08, "tt_plinth": 0.06}

dg = bpy.context.evaluated_depsgraph_get()
for o in list(coll.all_objects):
    if o.type != "MESH" or not o.modifiers:
        continue
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    old = o.data
    o.modifiers.clear()
    o.data = me
    me.name = old.name
    if old.users == 0:
        bpy.data.meshes.remove(old)


def densify(o, step):
    bm = bmesh.new()
    bm.from_mesh(o.data)
    for axis in range(3):
        lo = min(v.co[axis] for v in bm.verts)
        hi = max(v.co[axis] for v in bm.verts)
        if hi - lo < step * 1.5:
            continue
        n = int((hi - lo) / step)
        no = Vector((0, 0, 0))
        no[axis] = 1
        for k in range(1, n):
            co = Vector((0, 0, 0))
            co[axis] = lo + (hi - lo) * k / n
            bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=co, plane_no=no)
    bm.to_mesh(o.data)
    bm.free()


for name, step in DENSIFY.items():
    o = bpy.data.objects.get(name)
    if o and o.type == "MESH":
        densify(o, step)

targets = [o for o in coll.all_objects if o.type == "MESH" and o.name not in NO_AO]
for o in targets:
    ca = o.data.color_attributes
    for a in list(ca):
        ca.remove(a)
    a = ca.new("AO", "BYTE_COLOR", "POINT")
    ca.active_color = a
    ca.render_color_index = 0

scene = bpy.context.scene
prev_engine = scene.render.engine
scene.render.engine = "CYCLES"
scene.cycles.samples = 160
scene.cycles.device = "CPU"
if scene.world is None:
    scene.world = bpy.data.worlds.new("World")
scene.world.light_settings.distance = 0.55
for o in bpy.context.view_layer.objects:
    o.select_set(False)
for o in targets:
    o.hide_set(False)
    o.select_set(True)
bpy.context.view_layer.objects.active = targets[0]
bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
scene.render.engine = prev_engine


def smooth_ao(o, iters):
    me = o.data
    attr = me.color_attributes.get("AO")
    if attr is None or attr.domain != "POINT":
        return
    n = len(me.vertices)
    cols = [attr.data[i].color[0] for i in range(n)]
    nbr = [[] for _ in range(n)]
    for e in me.edges:
        a, b = e.vertices
        nbr[a].append(b)
        nbr[b].append(a)
    for _ in range(iters):
        cols = [(cols[i] * 2 + sum(cols[j] for j in nbr[i])) / (2 + len(nbr[i])) if nbr[i] else cols[i] for i in range(n)]
    for i, c in enumerate(cols):
        attr.data[i].color = (c, c, c, 1.0)


for o in targets:
    smooth_ao(o, 3 if o.name in DENSIFY else 1)

# ================================================================= EXPORT
os.makedirs(os.path.dirname(OUT), exist_ok=True)
for o in bpy.context.view_layer.objects:
    o.select_set(False)
for o in coll.all_objects:
    o.select_set(True)
gltf_args = dict(
    filepath=OUT,
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_yup=True,
    export_lights=False,
    export_cameras=False,
    export_extras=False,
    export_materials="EXPORT",
)
try:
    bpy.ops.export_scene.gltf(**gltf_args, export_vertex_color="ACTIVE")
except TypeError:
    bpy.ops.export_scene.gltf(**gltf_args, export_colors=True)
result = {"objects": len(coll.all_objects), "glb": OUT, "bytes": os.path.getsize(OUT)}
