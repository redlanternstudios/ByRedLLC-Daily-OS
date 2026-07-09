import { notFound } from "next/navigation"
import { ProjectBoard } from "@/components/byred/task-board"
import { projects } from "@/lib/task-registry"

export default function ProjectPage({ params }: { params: { slug: string } }) {
  const { slug } = params
  const project = projects.find((item) => item.slug === slug)

  if (!project) {
    notFound()
  }

  return <ProjectBoard project={project} />
}
