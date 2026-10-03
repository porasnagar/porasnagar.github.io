# Preview render of the room from a three.js-style camera. Not exported.
import bpy
import math
import os
from mathutils import Vector

OUT_DIR = r"C:\Users\poras\AppData\Local\Temp\claude\C--Users-poras-Desktop-poras-portfolio\3c2b9565-cc0f-4ad7-8d88-579b3b3b319a\scratchpad"
SHOTS = globals().get("SHOTS") or {
    "room": ((6.3, 4.5, 7.2), (-0.35, 1.0, -0.9), 30),
    "hifi": ((-0.45, 1.42, 0.05), (-0.45, 1.3, -2.75), 40),
}


def B(v):
    x, y, z = v
    return Vector((x, -z, y))


scene = bpy.context.scene
coll = bpy.data.collections.get("PreviewRig") or bpy.data.collections.new("PreviewRig")
if coll.name not in scene.collection.children:
    scene.collection.children.link(coll)
for o in list(coll.objects):
    bpy.data.objects.remove(o, do_unlink=True)
for name in ("Camera", "Light"):
    o = bpy.data.objects.get(name)
    if o and o.users_collection and o.users_collection[0] == scene.collection:
        bpy.data.objects.remove(o, do_unlink=True)

room = bpy.data.collections.get("ListeningRoom")
for o in scene.objects:
    if o.type == "MESH" and room and o.name not in room.all_objects:
        o.hide_render = True
        o.hide_set(True)

cam_data = bpy.data.cameras.new("preview_cam")
cam = bpy.data.objects.new("preview_cam", cam_data)
coll.objects.link(cam)
scene.camera = cam

sun = bpy.data.objects.new("preview_sun", bpy.data.lights.new("preview_sun", "SUN"))
sun.data.energy = 3.0
sun.data.color = (1.0, 0.9, 0.78)
sun.data.angle = math.radians(3)
coll.objects.link(sun)
sun.location = B((4, 6, -8))
sun.rotation_euler = (B((0.5, 0, -1.0)) - B((4, 6, -8))).to_track_quat("-Z", "Y").to_euler()

fill = bpy.data.objects.new("preview_fill", bpy.data.lights.new("preview_fill", "AREA"))
fill.data.energy = 900
fill.data.size = 6
fill.data.color = (1.0, 0.95, 0.9)
coll.objects.link(fill)
fill.location = B((5, 6, 6))
fill.rotation_euler = (B((-0.5, 0.5, -1)) - B((5, 6, 6))).to_track_quat("-Z", "Y").to_euler()

world = scene.world or bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get("Background")
bg.inputs["Color"].default_value = (0.72, 0.62, 0.52, 1)
bg.inputs["Strength"].default_value = 0.6

scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1280
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.film_transparent = False
try:
    scene.eevee.use_raytracing = True
except Exception:
    pass
scene.view_settings.view_transform = "AgX"

out = {}
for name, (pos, target, fov) in SHOTS.items():
    cam.location = B(pos)
    cam.rotation_euler = (B(target) - B(pos)).to_track_quat("-Z", "Y").to_euler()
    cam_data.sensor_fit = "VERTICAL"
    cam_data.angle_y = math.radians(fov)
    path = os.path.join(OUT_DIR, f"preview_{name}.png")
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    out[name] = path
result = out
