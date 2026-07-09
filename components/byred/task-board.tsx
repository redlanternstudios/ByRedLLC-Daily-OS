"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import type { Project, Task, TaskStatus } from "@/lib/task-registry"
import { projects, statusLabels } from "@/lib/task-registry"

async function fetchTasks(): Promise<Task[]> {
  const res = await fetch("/api/tasks", { cache: "no-store" })
  const data = (await res.json()) as { tasks?: Task[] }
  return data.tasks ?? []
}

export function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    void fetchTasks().then(setTasks)
  }, [])

  const grouped = useMemo(() => {
    return projects.map((project) => ({
      project,
      tasks: tasks.filter((task) => task.projectSlug === project.slug),
    }))
  }, [tasks])

  const updateTask = (id: string, status: TaskStatus) => {
    void fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.task) return
        setTasks((current) => current.map((task) => (task.id === id ? data.task : task)))
      })
  }

  const openCount = tasks.filter((task) => task.status !== "complete" && task.status !== "archived").length

  return (
    <div className="min-h-screen bg-[#0b0c10] text-zinc-100">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-8 flex flex-col gap-3 border-b border-white/10 pb-6">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-300">By Red OS</p>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-semibold text-4xl">Internal task board</h1>
              <p className="mt-2 max-w-2xl text-zinc-400">
                See what is left, who owns it, and mark work complete without leaving the OS.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/projects/sourcing" className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-zinc-200">
                Sourcing map
              </Link>
              <Link href="/projects/plan" className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-zinc-200">
                Project plan
              </Link>
              <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                {openCount} open tasks across {projects.length} active projects
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {projects.map((project) => {
            const projectTasks = tasks.filter((task) => task.projectSlug === project.slug)
            const open = projectTasks.filter((task) => task.status !== "complete" && task.status !== "archived").length
            const blocked = projectTasks.filter((task) => task.status === "blocked").length
            return (
              <Link
                key={project.slug}
                href={`/projects/${project.slug}`}
                className={`rounded-3xl border border-white/10 bg-gradient-to-br ${project.color} p-5 transition hover:border-amber-300/40`}
              >
                <p className="text-sm uppercase tracking-[0.25em] text-zinc-300">{project.owner}</p>
                <h2 className="mt-2 text-xl font-semibold">{project.name}</h2>
                <p className="mt-1 text-sm text-zinc-300">{project.description}</p>
                <div className="mt-4 flex gap-3 text-sm">
                  <span className="rounded-full bg-black/30 px-3 py-1">{open} open</span>
                  <span className="rounded-full bg-black/30 px-3 py-1">{blocked} blocked</span>
                </div>
              </Link>
            )
          })}
        </section>

        <section className="mt-8 grid gap-6">
          {grouped.map(({ project, tasks: projectTasks }) => (
            <div key={project.slug} className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold">{project.name}</h3>
                  <p className="text-sm text-zinc-400">Project board and execution trail</p>
                </div>
                <Link href={`/projects/${project.slug}`} className="text-sm text-amber-300">
                  Open project
                </Link>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {projectTasks.map((task) => (
                  <article key={task.id} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-zinc-400">
                          {task.assignee} · {task.storyPoints} pts
                        </p>
                        <h4 className="mt-1 text-lg font-medium">{task.title}</h4>
                      </div>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs">
                        {statusLabels[task.status]}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-400">Due {task.dueDate}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => updateTask(task.id, "complete")}
                        className="rounded-full bg-emerald-500 px-3 py-1.5 text-sm font-medium text-black"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => updateTask(task.id, "in progress")}
                        className="rounded-full border border-white/15 px-3 py-1.5 text-sm"
                      >
                        Reopen
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}

export function ProjectBoard({ project }: { project: Project }) {
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    void fetchTasks().then(setTasks)
  }, [])

  const projectTasks = tasks.filter((task) => task.projectSlug === project.slug)

  const setTaskStatus = (id: string, status: TaskStatus) => {
    void fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.task) return
        setTasks((current) => current.map((task) => (task.id === id ? data.task : task)))
      })
  }

  return (
    <div className="min-h-screen bg-[#0b0c10] text-zinc-100">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-amber-300">Project board</p>
            <h1 className="mt-2 text-3xl font-semibold">{project.name}</h1>
          </div>
          <Link href="/projects" className="text-sm text-amber-300">
            Back to board
          </Link>
        </div>

        <div className="grid gap-4">
          {projectTasks.map((task) => (
            <article key={task.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{task.title}</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Owner {task.owner} · Assignee {task.assignee} · Due {task.dueDate} · {task.storyPoints} points
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs">{statusLabels[task.status]}</span>
                  <button
                    onClick={() => setTaskStatus(task.id, "complete")}
                    className="rounded-full bg-emerald-500 px-3 py-1.5 text-sm font-medium text-black"
                  >
                    Complete
                  </button>
                  <button
                    onClick={() => setTaskStatus(task.id, "in progress")}
                    className="rounded-full border border-white/15 px-3 py-1.5 text-sm"
                  >
                    Reopen
                  </button>
                </div>
              </div>

              {task.blockerNote ? <p className="mt-3 text-sm text-amber-200">Blocker: {task.blockerNote}</p> : null}

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-400">Dependencies</h3>
                  <ul className="mt-2 space-y-1 text-sm text-zinc-300">
                    {task.dependencies.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-400">Acceptance Criteria</h3>
                  <ul className="mt-2 space-y-1 text-sm text-zinc-300">
                    {task.acceptanceCriteria.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-400">Definition of Done</h3>
                  <ul className="mt-2 space-y-1 text-sm text-zinc-300">
                    {task.definitionOfDone.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
