"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Building, Wrench } from "lucide-react"
import type { Branch, RepairJob } from "@/types"

// 1. Define the props interface for the component
interface BranchListProps {
  branches: Branch[]
  repairJobs: RepairJob[]
  onBranchSelect: (branch: Branch) => void
}

// 2. Use the props in your component
export default function BranchList({ branches, repairJobs, onBranchSelect }: BranchListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="w-5 h-5" />
          สาขาทั้งหมด
        </CardTitle>
        <CardDescription>เลือกสาขาเพื่อดูรายละเอียดเพิ่มเติม</CardDescription>
      </CardHeader>
      <CardContent>
        {branches.length > 0 ? (
          <div className="space-y-3">
            {branches.map((branch) => {
              const jobsInBranch = repairJobs.filter((job) => job.branchId === branch.id).length
              return (
                <div
                  key={branch.id}
                  className="flex justify-between items-center p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium text-sm">{branch.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Wrench className="w-3 h-3" />
                      {jobsInBranch} รายการซ่อม
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => onBranchSelect(branch)}>
                    ดูรายละเอียด
                  </Button>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
             <Building className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">ยังไม่มีสาขา</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}