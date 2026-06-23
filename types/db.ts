import type {
  ByredTask,
  ByredTenant,
  ByredUser,
  ByredLead,
  ByredActivity,
  ByredDailyBrief,
} from './database'

export type Task = ByredTask
export type Tenant = ByredTenant
export type User = ByredUser
export type Lead = ByredLead
export type Activity = ByredActivity
export type DailyBrief = ByredDailyBrief

export function mapTaskFromDb(row: ByredTask): Task {
  return row
}
