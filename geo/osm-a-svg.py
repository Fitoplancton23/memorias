import xml.etree.ElementTree as ET, glob, os, math, json, collections

SALIDA = '/home/claude/osm/salida'
os.makedirs(SALIDA, exist_ok=True)

# ---------- carga y fusion de los cuatro extractos ----------
nodos = {}            # id -> (lat, lon)
vias = {}             # id -> (refs, tags)
puntos = []           # nodos con nombre relevante
for f in sorted(glob.glob('/root/.claude/uploads/*/*.osm')):
    for ev, el in ET.iterparse(f, events=('end',)):
        if el.tag == 'node':
            i = el.get('id')
            nodos[i] = (float(el.get('lat')), float(el.get('lon')))
            t = {c.get('k'): c.get('v') for c in el.findall('tag')}
            if t.get('name') and (t.get('place') or t.get('amenity') or t.get('tourism') or t.get('historic')):
                puntos.append((t['name'], t.get('place') or t.get('amenity') or t.get('tourism') or t.get('historic'),
                               float(el.get('lat')), float(el.get('lon'))))
            el.clear()
        elif el.tag == 'way':
            i = el.get('id')
            if i not in vias:
                vias[i] = ([n.get('ref') for n in el.findall('nd')],
                           {c.get('k'): c.get('v') for c in el.findall('tag')})
            el.clear()
        elif el.tag == 'relation':
            el.clear()

# ---------- clasificacion en capas ----------
def capa(t):
    h = t.get('highway')
    if t.get('waterway') in ('river','stream','canal','ditch'): return 'cursos'
    if t.get('natural') in ('water','wetland'): return 'agua'
    if t.get('natural') == 'wood' or t.get('landuse') in ('forest','farmland','orchard','meadow','vineyard') or t.get('leisure') == 'park': return 'verde'
    if t.get('place') == 'city_block': return 'manzanas'
    if t.get('building'): return 'edificios'
    if h in ('motorway','trunk','primary','secondary','tertiary','motorway_link','trunk_link','primary_link','secondary_link'): return 'rutas'
    if h in ('residential','unclassified','living_street','service','pedestrian'): return 'calles'
    if h in ('track','path','footway','cycleway'): return 'caminos'
    return None

RELLENO = {'agua':1, 'verde':1, 'manzanas':1, 'edificios':1}
ESTILO = {
  'verde':     'fill="#14261a" stroke="none"',
  'agua':      'fill="#13303a" stroke="#2a6f82" stroke-width="1.2"',
  'cursos':    'fill="none" stroke="#2a6f82" stroke-width="1.6"',
  'manzanas':  'fill="#1b1e1b" stroke="#2e332e" stroke-width="0.8"',
  'edificios': 'fill="#262a26" stroke="none"',
  'caminos':   'fill="none" stroke="#3a3f3a" stroke-width="0.8" stroke-dasharray="4 3"',
  'calles':    'fill="none" stroke="#575e57" stroke-width="1.4"',
  'rutas':     'fill="none" stroke="#8a8a80" stroke-width="2.6"',
}
ORDEN = ['verde','agua','cursos','manzanas','edificios','caminos','calles','rutas']

# ---------- proyeccion Web Mercator ----------
R = 20037508.34
mx = lambda lon: lon * R / 180
my = lambda lat: math.log(math.tan((90 + lat) * math.pi / 360)) / (math.pi / 180) * R / 180

def construir(nombre, bbox, ancho=2000, titulo=''):
    minlat, minlon, maxlat, maxlon = bbox
    x0, x1 = mx(minlon), mx(maxlon)
    y0, y1 = my(minlat), my(maxlat)
    alto = round(ancho * (y1 - y0) / (x1 - x0))
    px = lambda lon: (mx(lon) - x0) / (x1 - x0) * ancho
    py = lambda lat: (y1 - my(lat)) / (y1 - y0) * alto

    m = .004
    L, B, R_, T = minlon - m, minlat - m, maxlon + m, maxlat + m
    dentro = lambda la, lo: B <= la <= T and L <= lo <= R_

    def recortar_poligono(pts):
        """Sutherland-Hodgman contra el bbox. Sin esto, un polígono con un nodo
           lejos del recorte dibuja una cuña gigante que no existe."""
        def corte(sal, p1, p2):
            (la1, lo1), (la2, lo2) = p1, p2
            if sal in ('L', 'R'):
                x = L if sal == 'L' else R_
                t = (x - lo1) / (lo2 - lo1); return (la1 + t * (la2 - la1), x)
            y = B if sal == 'B' else T
            t = (y - la1) / (la2 - la1); return (y, lo1 + t * (lo2 - lo1))
        adentro = {'L': lambda p: p[1] >= L, 'R': lambda p: p[1] <= R_,
                   'B': lambda p: p[0] >= B, 'T': lambda p: p[0] <= T}
        salida = pts[:-1] if len(pts) > 1 and pts[0] == pts[-1] else pts[:]
        for lado in 'LRBT':
            if not salida: return []
            ent = adentro[lado]; entrada, salida = salida, []
            for i, act in enumerate(entrada):
                ant = entrada[i - 1]
                if ent(act):
                    if not ent(ant): salida.append(corte(lado, ant, act))
                    salida.append(act)
                elif ent(ant):
                    salida.append(corte(lado, ant, act))
        return salida

    def tramos_linea(pts):
        """Corta la línea en los tramos que quedan dentro, en vez de tirar la vía entera."""
        out, act = [], []
        for p in pts:
            if dentro(*p): act.append(p)
            elif act: out.append(act); act = []
        if act: out.append(act)
        return [t for t in out if len(t) >= 2]

    grupos = collections.defaultdict(list)
    for i, (refs, t) in vias.items():
        c = capa(t)
        if not c: continue
        pts = [nodos[r] for r in refs if r in nodos]
        if len(pts) < 2: continue
        if not any(dentro(la, lo) for la, lo in pts): continue
        if c in RELLENO and pts[0] != pts[-1]: continue
        cerrado = c in RELLENO
        for tramo in ([recortar_poligono(pts)] if cerrado else tramos_linea(pts)):
            if len(tramo) < (3 if cerrado else 2): continue
            d = 'M ' + ' L '.join(f'{px(lo):.1f} {py(la):.1f}' for la, lo in tramo)
            if cerrado: d += ' Z'
            grupos[c].append(d)

    hitos = [(n, k, la, lo) for n, k, la, lo in set(puntos) if dentro(la, lo)]
    # Etiquetar los 233 hitos los vuelve ilegibles. Sólo llevan texto los núcleos
    # poblados y los saltos: son los que orientan. El resto queda como punto.
    ETIQUETABLES = {'town','village','hamlet','locality','isolated_dwelling','neighbourhood','attraction','waterfall'}
    rotulados = sorted({(n, la, lo) for n, k, la, lo in hitos if k in ETIQUETABLES})

    partes = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {ancho} {alto}" width="{ancho}" height="{alto}">',
              f'  <!-- {titulo} · base generada desde OpenStreetMap (ODbL) · Web Mercator -->',
              f'  <!-- bounds: {minlat} {minlon} {maxlat} {maxlon} -->',
              f'  <rect id="fondo" width="{ancho}" height="{alto}" fill="#0b0c0b"/>']
    for c in ORDEN:
        if not grupos[c]: continue
        partes.append(f'  <g id="{c}" {ESTILO[c]} stroke-linejoin="round" stroke-linecap="round">')
        partes += [f'    <path d="{d}"/>' for d in grupos[c]]
        partes.append('  </g>')
    if hitos:
        partes.append('  <g id="hitos" fill="#d9d6cc">')
        partes += [f'    <circle cx="{px(lo):.1f}" cy="{py(la):.1f}" r="3"><title>{n}</title></circle>' for n,k,la,lo in hitos]
        partes.append('  </g>')
        partes.append('  <g id="etiquetas" fill="#d9d6cc" font-family="monospace" font-size="12">')
        partes += [f'    <text x="{px(lo)+6:.1f}" y="{py(la)+4:.1f}">{n.replace("&","y").replace("<","").replace(">","")}</text>' for n,la,lo in rotulados]
        partes.append('  </g>')
    partes.append('</svg>')
    svg = '\n'.join(partes)
    open(f'{SALIDA}/{nombre}.svg','w',encoding='utf-8').write(svg)

    geo = {'type':'FeatureCollection','features':[]}
    for i,(refs,t) in vias.items():
        c = capa(t)
        if not c: continue
        pts=[nodos[r] for r in refs if r in nodos]
        if len(pts)<2 or not any(dentro(la,lo) for la,lo in pts): continue
        if c in RELLENO and pts[0]!=pts[-1]: continue
        cerrado = c in RELLENO
        geo['features'].append({'type':'Feature',
          'properties':{'capa':c,'nombre':t.get('name'),'osm_id':i},
          'geometry':{'type':'Polygon' if cerrado else 'LineString',
                      'coordinates':[[[lo,la] for la,lo in pts]] if cerrado else [[lo,la] for la,lo in pts]}})
    for n,k,la,lo in hitos:
        geo['features'].append({'type':'Feature','properties':{'capa':'hito','nombre':n,'tipo':k},
                                'geometry':{'type':'Point','coordinates':[lo,la]}})
    json.dump(geo, open(f'{SALIDA}/{nombre}.geojson','w',encoding='utf-8'), ensure_ascii=False)

    kb_svg = os.path.getsize(f'{SALIDA}/{nombre}.svg')/1024
    kb_geo = os.path.getsize(f'{SALIDA}/{nombre}.geojson')/1024
    print(f"  {nombre:8} viewBox 0 0 {ancho} {alto} · {sum(len(v) for v in grupos.values())} trazados · "
          f"{len(hitos)} hitos ({len(rotulados)} rotulados) · svg {kb_svg:.0f} KB · geojson {kb_geo:.0f} KB")
    for c in ORDEN:
        if grupos[c]: print(f"      #{c:10} {len(grupos[c])}")
    return {'nombre':nombre,'bounds':[minlat,minlon,maxlat,maxlon],'viewBox':[ancho,alto],'proyeccion':'EPSG:3857'}

# casco real: la extension de las manzanas, no la del recorte
mlat=[];mlon=[]
for i,(refs,t) in vias.items():
    if t.get('place')=='city_block':
        for r in refs:
            if r in nodos and -27.13<=nodos[r][0]<=-27.07 and -54.95<=nodos[r][1]<=-54.84:
                mlat.append(nodos[r][0]); mlon.append(nodos[r][1])
m=0.004
casco=(min(mlat)-m,min(mlon)-m,max(mlat)+m,max(mlon)+m)
ejido=(-27.15281,-54.96031,-27.00100,-54.75809)

print(f"Casco real (extension de las manzanas): {(casco[3]-casco[1])*99.2:.1f} km × {(casco[2]-casco[0])*110.9:.1f} km")
print(f"Territorio completo: {(ejido[3]-ejido[1])*99.2:.1f} km × {(ejido[2]-ejido[0])*110.9:.1f} km")
print(f"El casco ocupa el {(casco[3]-casco[1])/(ejido[3]-ejido[1])*100:.1f}% del ancho del territorio\n")

mapas=[construir('ejido',ejido,2000,'Territorio: Aristobulo del Valle, Salto Encantado y Cerro Moreno'),
       construir('casco',casco,2000,'Casco urbano de Aristobulo del Valle')]
json.dump({'mapas':mapas,'fuente':'OpenStreetMap contributors, ODbL'},
          open(f'{SALIDA}/mapa.json','w',encoding='utf-8'), ensure_ascii=False, indent=2)
