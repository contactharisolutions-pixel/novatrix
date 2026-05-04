import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { ZoomIn, ZoomOut, Maximize, RefreshCw, Users, ShieldCheck, Activity, TrendingUp, Search } from 'lucide-react'
import api from '../../lib/api'
import { PageHeader, Spinner, DataTable, StatCard, Panel, Badge } from '../../components/member/ui'
import toast from 'react-hot-toast'

// Color map for node status
const STATUS_COLOR = { active: 'var(--green)', inactive: 'var(--text-faint)', blocked: 'var(--red)' }

function TreeCanvas({ treeData }) {
  const svgRef   = useRef(null)
  const zoomRef  = useRef(null)

  const render = useCallback(() => {
    if (!treeData || !svgRef.current) return

    const svg    = d3.select(svgRef.current)
    const width  = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight || 520

    svg.selectAll('*').remove()

    const g = svg.append('g')

    // Zoom behaviour — attach before setting initial transform
    const zoom = d3.zoom()
      .scaleExtent([0.2, 3])
      .on('zoom', (event) => g.attr('transform', event.transform))
    svg.call(zoom)
    zoomRef.current = { zoom, svg, initialTransform: null } // initialTransform set below after centering

    // Compute tree layout
    const root      = d3.hierarchy(treeData)
    const treeLayout = d3.tree().nodeSize([160, 100])
    treeLayout(root)

    const nodes = root.descendants()
    const links = root.links()

    // Compute centering offset and seed it into the zoom transform
    // so scroll-wheel zoom uses this as the base (no position jump)
    const xs = nodes.map((n) => n.x)
    const minX = Math.min(...xs), maxX = Math.max(...xs)
    const centerX = width / 2 - (minX + maxX) / 2
    const initialTransform = d3.zoomIdentity.translate(centerX, 80)
    svg.call(zoom.transform, initialTransform)
    zoomRef.current.initialTransform = initialTransform


    // Links
    g.selectAll('path.link')
      .data(links)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d3.linkVertical().x((d) => d.x).y((d) => d.y))
      .attr('fill', 'none')
      .attr('stroke', 'var(--border-cyan)')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.4)

    // Node groups
    const node = g.selectAll('g.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d) => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')

    // Node glass effect
    node.append('circle')
      .attr('r', 32)
      .attr('fill', (d) => d.depth === 0 ? 'var(--cyan-glow)' : 'var(--panel-bg)')
      .attr('stroke', (d) => STATUS_COLOR[d.data.status] || 'var(--cyan)')
      .attr('stroke-width', 2.5)
      .attr('style', 'filter: drop-shadow(0 0 8px rgba(0,212,255,0.1))')

    // Initials text
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.4em')
      .attr('fill', '#fff')
      .attr('font-size', '14px')
      .attr('font-weight', '800')
      .text((d) => (d.data.name || 'U').slice(0, 2).toUpperCase())

    // Label container
    const labelGroup = node.append('g').attr('transform', 'translate(0, 50)')

    labelGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--text-primary)')
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .text((d) => d.data.name?.length > 12 ? d.data.name.slice(0, 12) + '…' : d.data.name || '—')

    labelGroup.append('text')
      .attr('dy', '14px')
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--cyan)')
      .attr('font-size', '9px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text((d) => d.data.user_id || '')

    // Level badge
    if (nodes.length > 1) {
      node.filter((d) => d.depth > 0)
        .append('circle')
        .attr('cx', 24).attr('cy', -24)
        .attr('r', 10)
        .attr('fill', 'var(--purple)')
      
      node.filter((d) => d.depth > 0)
        .append('text')
        .attr('x', 24).attr('y', -20)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .attr('font-size', '8px')
        .attr('font-weight', '900')
        .text((d) => `L${d.depth}`)
    }

  }, [treeData])

  useEffect(() => { render() }, [render])

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const ro = new ResizeObserver(() => render())
    ro.observe(el)
    return () => ro.disconnect()
  }, [render])

  const zoomIn  = () => zoomRef.current?.svg.transition().call(zoomRef.current.zoom.scaleBy, 1.3)
  const zoomOut = () => zoomRef.current?.svg.transition().call(zoomRef.current.zoom.scaleBy, 0.7)
  const reset   = () => {
    const { svg, zoom, initialTransform } = zoomRef.current || {}
    if (svg && zoom) svg.transition().call(zoom.transform, initialTransform || d3.zoomIdentity)
  }

  return (
    <Panel style={{ height: 560, padding: 0, position: 'relative', overflow: 'hidden', background: '#020617' }}>
      {/* Controls */}
      <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {[
          { icon: ZoomIn,    label: 'Zoom In',  action: zoomIn  },
          { icon: ZoomOut,   label: 'Zoom Out', action: zoomOut },
          { icon: Maximize,  label: 'Reset View', action: reset   },
        ].map(({ icon: Icon, label, action }) => (
          <button key={label} onClick={action} title={label}
            style={{
              width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--panel-bg)',
              border: '1px solid var(--border)', color: 'var(--text-muted)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'var(--transition-normal)'
            }} className="tree-btn">
            <Icon size={18} />
          </button>
        ))}
      </div>

      {/* Legend */}
      <div style={{ position: 'absolute', bottom: '1.25rem', left: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        {Object.entries(STATUS_COLOR).map(([s, c]) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'capitalize' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
            {s}
          </div>
        ))}
      </div>

      <svg ref={svgRef} width="100%" height="100%" />
      <style>{`
        .tree-btn:hover { color: var(--cyan); border-color: var(--cyan); background: var(--cyan-glow); }
      `}</style>
    </Panel>
  )
}

/* ── Level Drill-down Table ── */
const LEVEL_COLS = [
  { key: 'user_id',       label: 'User ID', render: (v) => <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8125rem' }}>{v}</span> },
  { key: 'name',          label: 'Name', render: (v) => <span style={{ fontWeight: 700 }}>{v}</span> },
  { key: 'status',        label: 'Status',  render: (v) => <Badge status={v} /> },
  { key: 'total_invested', label: 'Total Invested', render: (v) => <span style={{ fontWeight: 800, color: 'var(--green)' }}>${(+v || 0).toLocaleString()}</span> },
  { key: 'created_at',    label: 'Join Date', render: (v) => { const d = v ? new Date(v) : null; return <span style={{ fontSize: '0.8125rem', color: 'var(--text-faint)' }}>{d && !isNaN(d) ? d.toLocaleDateString() : '—'}</span> } },
]

export default function GenealogyPage() {
  const [treeData, setTreeData]   = useState(null)
  const [levels,   setLevels]     = useState({})
  const [selLevel, setSelLevel]   = useState(null)
  const [page,     setPage]       = useState(1)
  const [pagination, setPagination] = useState(null)
  const [tab,      setTab]        = useState('tree')
  const [loading,  setLoading]    = useState(true)
  const [lvlLoading, setLvlLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/genealogy/tree'),
      api.get('/genealogy/level-report'),
    ])
      .then(([treeRes, lvlRes]) => {
        setTreeData(treeRes.data.tree)
        setLevels(lvlRes.data.levels || {})
      })
      .catch(() => toast.error('Could not load network data'))
      .finally(() => setLoading(false))
  }, [])

  const loadLevelPage = async (lvl, pg) => {
    setLvlLoading(true)
    try {
      const { data } = await api.get(`/genealogy/level-report?level=${lvl}&page=${pg}`)
      setLevels((prev) => ({ ...prev, [lvl]: data.levels[lvl] }))
      setPagination(data.pagination)
      setPage(pg)
    } finally { setLvlLoading(false) }
  }

  const totalMembers   = Object.values(levels).reduce((s, arr) => s + arr.length, 0)
  const activeMembers  = Object.values(levels).flat().filter((m) => m.status === 'active').length
  const totalInvested  = Object.values(levels).flat().reduce((s, m) => s + (+m.total_invested || 0), 0)

  if (loading) return <Spinner />

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
      <PageHeader title="My Network" subtitle="View your team and network growth across all levels" />

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--gap-md)' }}>
        <StatCard label="Total Members" value={totalMembers}          icon={Users}       color="cyan"   />
        <StatCard label="Active Members" value={activeMembers}         icon={ShieldCheck} color="green"  />
        <StatCard label="Team Investment" value={`$${totalInvested.toLocaleString()}`} icon={TrendingUp}  color="purple" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '2px' }}>
        {[
          { id: 'tree',   label: 'Network Tree', icon: Activity },
          { id: 'levels', label: 'Level View', icon: Users },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              background: 'none', border: 'none', padding: '0.75rem 1rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.875rem', fontWeight: 700,
              color: tab === t.id ? 'var(--cyan)' : 'var(--text-muted)',
              borderBottom: `2px solid ${tab === t.id ? 'var(--cyan)' : 'transparent'}`,
              transition: 'var(--transition-normal)', marginBottom: '-2px',
            }}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* Tree view */}
      {tab === 'tree' && (
        <div className="scale-in">
          {treeData ? <TreeCanvas treeData={treeData} /> : <Panel style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-faint)' }}>No team members yet. Share your referral link to grow your network.</Panel>}
        </div>
      )}

      {/* Level report */}
      {tab === 'levels' && (
        <div className="scale-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>
          {/* Level selector pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {Object.keys(levels).sort((a,b) => a-b).map((lvl) => (
              <button key={lvl} onClick={() => { setSelLevel(+lvl); loadLevelPage(+lvl, 1) }}
                style={{
                  padding: '0.625rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                  background: selLevel === +lvl ? 'var(--cyan-glow)' : 'var(--panel-bg)',
                  borderColor: selLevel === +lvl ? 'var(--cyan)' : 'var(--border)',
                  color: selLevel === +lvl ? 'var(--cyan)' : 'var(--text-secondary)',
                  fontSize: '0.8125rem', fontWeight: 800, transition: 'var(--transition-normal)', cursor: 'pointer'
                }}>
                LEVEL {lvl} <span style={{ opacity: 0.5, marginLeft: '0.5rem', fontWeight: 600 }}>({levels[lvl].length})</span>
              </button>
            ))}
          </div>

          {/* Table */}
          {selLevel ? (
            lvlLoading ? <Spinner /> : (
              <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <Search size={16} style={{ color: 'var(--cyan)' }} />
                  <p style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)' }}>Team List: Level {selLevel}</p>
                </div>
                <DataTable columns={LEVEL_COLS} data={levels[selLevel] || []} emptyText="No members found at this level." />
                
                {/* Pagination */}
                {pagination && pagination.pages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                    {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((pg) => (
                      <button key={pg} onClick={() => loadLevelPage(selLevel, pg)}
                        style={{
                          width: 36, height: 36, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                          background: pg === page ? 'var(--cyan-glow)' : 'var(--panel-bg)',
                          borderColor: pg === page ? 'var(--cyan)' : 'var(--border)',
                          color: pg === page ? 'var(--cyan)' : 'var(--text-muted)',
                          fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer'
                        }}>
                        {pg}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {Object.entries(levels).sort((a,b) => a[0]-b[0]).map(([lvl, members]) => (
                <div key={lvl} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', background: 'var(--panel-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', background: 'var(--purple-glow)', border: '1px solid var(--border-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 900, color: 'var(--purple)' }}>
                      L{lvl}
                    </div>
                    <div>
                      <p style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-primary)' }}>{members.length} Members</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>{members.filter((m) => m.status === 'active').length} Active Members</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', marginRight: '2rem' }}>
                    <p style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--green)' }}>${members.reduce((s, m) => s + (+m.total_invested || 0), 0).toLocaleString()}</p>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Investment</p>
                  </div>
                  <button onClick={() => { setSelLevel(+lvl); loadLevelPage(+lvl, 1) }} className="btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.75rem' }}>
                    View Members
                  </button>
                </div>
              ))}
              {!Object.keys(levels).length && (
                <Panel style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-faint)' }}>No network entities discovered.</Panel>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
