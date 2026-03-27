'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useBusiness } from '@/contexts/BusinessContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { BarChart3, Plus, Pencil, Trash2, GripVertical, X, Star } from 'lucide-react'
import { toast } from 'sonner'

interface Pipeline {
  id: string
  business_id: string
  name: string
  stages: string[]
  is_default: boolean
  created_at: string
}

interface Props {
  pipelines: Pipeline[]
  businessId: string
  slug: string
}

const DEFAULT_STAGES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost']
const STAGE_COLORS = [
  'bg-slate-100 text-slate-700',
  'bg-blue-100 text-blue-700',
  'bg-amber-100 text-amber-700',
  'bg-orange-100 text-orange-700',
  'bg-green-100 text-green-700',
  'bg-red-100 text-red-700',
]

export function PipelinesClient({ pipelines: initial, businessId, slug }: Props) {
  const { business } = useBusiness()
  const router = useRouter()
  const [pipelines, setPipelines] = useState(initial)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Pipeline | null>(null)
  const [name, setName] = useState('')
  const [stages, setStages] = useState<string[]>(DEFAULT_STAGES)
  const [newStage, setNewStage] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<Pipeline | null>(null)
  const [deleting, setDeleting] = useState(false)

  function openNew() {
    setEditing(null)
    setName('')
    setStages([...DEFAULT_STAGES])
    setNewStage('')
    setSheetOpen(true)
  }

  function openEdit(p: Pipeline) {
    setEditing(p)
    setName(p.name)
    setStages(Array.isArray(p.stages) ? [...p.stages] : [...DEFAULT_STAGES])
    setNewStage('')
    setSheetOpen(true)
  }

  function addStage() {
    const trimmed = newStage.trim()
    if (!trimmed) return
    if (stages.includes(trimmed)) { toast.error('Stage already exists'); return }
    setStages(prev => [...prev, trimmed])
    setNewStage('')
  }

  function removeStage(i: number) {
    setStages(prev => prev.filter((_, idx) => idx !== i))
  }

  function moveStage(from: number, to: number) {
    if (to < 0 || to >= stages.length) return
    const next = [...stages]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    setStages(next)
  }

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Pipeline name is required'); return }
    if (stages.length < 2) { toast.error('Add at least 2 stages'); return }
    setSaving(true)
    const supabase = createClient()

    const payload = {
      business_id: businessId,
      name: name.trim(),
      stages,
    }

    if (editing) {
      const { data, error } = await supabase
        .from('pipelines').update(payload).eq('id', editing.id).select().single()
      if (error) { toast.error(error.message); setSaving(false); return }
      setPipelines(prev => prev.map(p => p.id === editing.id ? data : p))
      toast.success('Pipeline updated')
    } else {
      const isFirst = pipelines.length === 0
      const { data, error } = await supabase
        .from('pipelines').insert({ ...payload, is_default: isFirst }).select().single()
      if (error) { toast.error(error.message); setSaving(false); return }
      setPipelines(prev => [...prev, data])
      toast.success('Pipeline created')
    }

    setSaving(false)
    setSheetOpen(false)
  }

  const handleSetDefault = async (p: Pipeline) => {
    const supabase = createClient()
    // Unset all, then set this one
    await supabase.from('pipelines').update({ is_default: false }).eq('business_id', businessId)
    const { data, error } = await supabase
      .from('pipelines').update({ is_default: true }).eq('id', p.id).select().single()
    if (error) { toast.error(error.message); return }
    setPipelines(prev => prev.map(pl => ({ ...pl, is_default: pl.id === p.id })))
    toast.success(`"${p.name}" is now the default pipeline`)
  }

  const handleDelete = async () => {
    if (!deleteDialog) return
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('pipelines').delete().eq('id', deleteDialog.id)
    if (error) { toast.error(error.message); setDeleting(false); return }
    setPipelines(prev => prev.filter(p => p.id !== deleteDialog.id))
    setDeleteDialog(null)
    setDeleting(false)
    toast.success('Pipeline deleted')
  }

  return (
    <div>
      <PageHeader
        title="Pipelines"
        breadcrumbs={[
          { label: business.name, href: `/app/${slug}` },
          { label: 'Leads', href: `/app/${slug}/leads` },
          { label: 'Pipelines' },
        ]}
        action={
          <Button onClick={openNew} className="bg-[#0F4C81] hover:bg-[#0d3f6e]">
            <Plus className="mr-2 h-4 w-4" />New Pipeline
          </Button>
        }
      />

      {pipelines.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No pipelines yet"
          description="Create a pipeline to organise your leads into stages."
          actionLabel="Create Pipeline"
          onAction={openNew}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pipelines.map(p => {
            const stageList: string[] = Array.isArray(p.stages) ? p.stages : []
            return (
              <Card key={p.id} className={p.is_default ? 'border-[#0F4C81]' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{p.name}</CardTitle>
                      {p.is_default && (
                        <Badge className="bg-[#0F4C81] text-white text-xs">Default</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!p.is_default && (
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-amber-500"
                          title="Set as default"
                          onClick={() => handleSetDefault(p)}
                        >
                          <Star className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => setDeleteDialog(p)}
                        disabled={p.is_default && pipelines.length > 1}
                        title={p.is_default && pipelines.length > 1 ? 'Set another pipeline as default first' : 'Delete'}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{stageList.length} stages</p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1.5">
                    {stageList.map((stage, i) => (
                      <span
                        key={i}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${STAGE_COLORS[i % STAGE_COLORS.length]}`}
                      >
                        {stage}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit Pipeline' : 'New Pipeline'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 mt-6">
            <div className="space-y-2">
              <Label>Pipeline Name *</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Sales Pipeline"
              />
            </div>

            <div className="space-y-2">
              <Label>Stages</Label>
              <p className="text-xs text-muted-foreground">Drag to reorder. Leads move through these stages left to right.</p>
              <div className="space-y-1.5">
                {stages.map((stage, i) => (
                  <div key={i} className="flex items-center gap-2 group">
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => moveStage(i, i - 1)}
                        disabled={i === 0}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-20 leading-none"
                      >▴</button>
                      <button
                        type="button"
                        onClick={() => moveStage(i, i + 1)}
                        disabled={i === stages.length - 1}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-20 leading-none"
                      >▾</button>
                    </div>
                    <span
                      className={`flex-1 text-sm px-2.5 py-1.5 rounded-md font-medium ${STAGE_COLORS[i % STAGE_COLORS.length]}`}
                    >
                      {stage}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeStage(i)}
                      className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-2">
                <Input
                  value={newStage}
                  onChange={e => setNewStage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addStage())}
                  placeholder="Add a stage..."
                  className="h-8 text-sm"
                />
                <Button type="button" variant="outline" size="sm" onClick={addStage} className="shrink-0">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-[#0F4C81] hover:bg-[#0d3f6e]"
              >
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Pipeline'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteDialog}
        onOpenChange={o => !o && setDeleteDialog(null)}
        title={`Delete "${deleteDialog?.name}"?`}
        description="All leads in this pipeline will lose their pipeline assignment. This cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  )
}
