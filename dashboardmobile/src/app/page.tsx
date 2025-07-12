"use client"

import { useState, useEffect, useMemo } from "react"
import { onAuthStateChanged, type User } from "firebase/auth"
import { collection, onSnapshot, addDoc, doc, query, orderBy, updateDoc, deleteDoc } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import type { Branch, StockItem, RepairJob, Page } from "@/types"

// Components
import LoginForm from "@/components/auth/login-form"
import Header from "@/components/layout/header"
import StatsCards from "@/components/dashboard/stats-cards"
import BranchList from "@/components/branches/branch-list"
import RecentRepairs from "@/components/repairs/recent-repairs"
import AddBranchForm from "@/components/forms/add-branch-form"
import StockForm from "@/components/forms/forms stock-form"
import RepairJobForm from "@/components/forms/repair-job-form"
import RepairReceipt from "@/components/repairs/repair-receipt"

// UI Components
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// Icons
import {
  ArrowLeft,
  Edit,
  Trash2,
  Plus,
  Package,
  Wrench,
  CheckCircle,
  FileText,
  Clock,
  Smartphone,
  Calendar,
  DollarSign,
  Shield,
  Camera,
} from "lucide-react"

export default function IProDashboard() {
  // State
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [branches, setBranches] = useState<Branch[]>([])
  const [stock, setStock] = useState<StockItem[]>([])
  const [repairJobs, setRepairJobs] = useState<RepairJob[]>([])
  const [currentPage, setCurrentPage] = useState<Page>("main")
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [modalError, setModalError] = useState("")

  // Authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  // Data fetching
  useEffect(() => {
    if (!currentUser) {
      setBranches([])
      setStock([])
      setRepairJobs([])
      return
    }

    const unsubscribers = [
      onSnapshot(collection(db, "branches"), (snapshot) => {
        const branchesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || "",
          ...doc.data(),
        })) as Branch[]
        setBranches(branchesData)
      }),
      onSnapshot(collection(db, "stock"), (snapshot) => {
        const stockData = snapshot.docs.map((doc) => ({
          id: doc.id,
          branchId: doc.data().branchId || "",
          name: doc.data().name || "",
          quantity: doc.data().quantity || 0,
          ...doc.data(),
        })) as StockItem[]
        setStock(stockData)
      }),
      onSnapshot(query(collection(db, "repairJobs"), orderBy("createdAt", "desc")), (snapshot) => {
        const repairJobsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          branchId: doc.data().branchId || "",
          customerName: doc.data().customerName || "",
          phoneModel: doc.data().phoneModel || "",
          dateReceived: doc.data().dateReceived || "",
          symptoms: doc.data().symptoms || "",
          estimatedPrice: doc.data().estimatedPrice || 0,
          isUnderWarranty: doc.data().isUnderWarranty || false,
          technicianName: doc.data().technicianName || "",
          expectedCompletionDate: doc.data().expectedCompletionDate || "",
          status: doc.data().status || "in_progress",
          images: doc.data().images || [],
          createdAt: doc.data().createdAt || "",
          ...doc.data(),
        })) as RepairJob[]
        setRepairJobs(repairJobsData)
      }),
    ]

    return () => unsubscribers.forEach((unsub) => unsub())
  }, [currentUser])

  // Computed values
  const { totalRevenue, totalRepairs, completedRepairs, inProgressRepairs, selectedBranchStock, selectedBranchJobs } =
    useMemo(() => {
      const completedJobs = repairJobs.filter((job) => job.status === "completed")
      const totalRevenue = completedJobs.reduce((sum, job) => sum + (job.estimatedPrice || 0), 0)
      const totalRepairs = repairJobs.length
      const completedRepairs = completedJobs.length
      const inProgressRepairs = repairJobs.filter((job) => job.status === "in_progress").length

      const selectedBranchStock = stock.filter((item) => item.branchId === selectedBranch?.id)
      const selectedBranchJobs = repairJobs.filter((job) => job.branchId === selectedBranch?.id)

      return {
        totalRevenue,
        totalRepairs,
        completedRepairs,
        inProgressRepairs,
        selectedBranchStock,
        selectedBranchJobs,
      }
    }, [repairJobs, stock, selectedBranch])

  // Handlers
  const handleBranchSelect = (branch: Branch) => {
    setSelectedBranch(branch)
    setCurrentPage("branch_details")
  }

  const handleAddBranch = async (branchName: string) => {
    if (branchName) {
      await addDoc(collection(db, "branches"), { name: branchName })
    }
  }

  const handleAddOrUpdateStockItem = async (itemName: string, quantity: number, stockIdToUpdate?: string) => {
    if (!itemName || quantity <= 0 || !selectedBranch) return

    if (stockIdToUpdate) {
      await updateDoc(doc(db, "stock", stockIdToUpdate), { quantity })
    } else {
      await addDoc(collection(db, "stock"), {
        branchId: selectedBranch.id,
        name: itemName,
        quantity: Number.parseInt(quantity.toString(), 10),
      })
    }
  }

  const handleDeleteStockItem = async (stockId: string) => {
    if (!stockId) return
    await deleteDoc(doc(db, "stock", stockId))
  }

  const handleAddOrUpdateRepairJob = async (
    repairData: Omit<RepairJob, "id" | "branchId" | "createdAt">,
    jobToUpdate?: RepairJob,
  ) => {
    if (!selectedBranch || !repairData.customerName || !repairData.symptoms) {
      return setModalError("กรุณากรอกข้อมูลให้ครบถ้วน")
    }

    try {
      if (jobToUpdate) {
        await updateDoc(doc(db, "repairJobs", jobToUpdate.id), repairData)
      } else {
        await addDoc(collection(db, "repairJobs"), {
          ...repairData,
          branchId: selectedBranch.id,
          createdAt: new Date().toISOString(),
        })
      }
      setModalError("")
    } catch (e: any) {
      console.error("Failed to save repair job:", e)
      setModalError(e.message)
    }
  }

  const handleDeleteRepairJob = async (job: RepairJob) => {
    if (!job) return
    try {
      await deleteDoc(doc(db, "repairJobs", job.id))
    } catch (e: any) {
      console.error("Delete failed:", e)
      setModalError(e.message)
    }
  }

  const handleCompleteRepair = async (job: RepairJob) => {
    try {
      await updateDoc(doc(db, "repairJobs", job.id), { status: "completed" })
    } catch (e: any) {
      console.error("Failed to complete repair:", e)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  // Login form
  if (!currentUser) {
    return <LoginForm />
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6">
        {/* Navigation */}
        {currentPage !== "main" && (
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => {
                if (currentPage === "stock_management") {
                  setCurrentPage("branch_details")
                } else {
                  setCurrentPage("main")
                }
              }}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {currentPage === "stock_management" ? "กลับไปหน้ารายละเอียดสาขา" : "กลับไปหน้าหลัก"}
            </Button>
          </div>
        )}

        {/* Main Dashboard */}
        {currentPage === "main" && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">ภาพรวมทั้งหมด</h2>
                <p className="text-muted-foreground">จัดการร้านซ่อมมือถือของคุณ</p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    เพิ่มสาขาใหม่
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>เพิ่มสาขาใหม่</DialogTitle>
                    <DialogDescription>กรอกชื่อสาขาที่ต้องการเพิ่ม</DialogDescription>
                  </DialogHeader>
                  <AddBranchForm onSubmit={handleAddBranch} onClose={() => {}} />
                </DialogContent>
              </Dialog>
            </div>

            <StatsCards
              totalRevenue={totalRevenue}
              totalRepairs={totalRepairs}
              completedRepairs={completedRepairs}
              inProgressRepairs={inProgressRepairs}
            />

            <div className="grid gap-6 lg:grid-cols-2">
              <BranchList branches={branches} repairJobs={repairJobs} onBranchSelect={handleBranchSelect} />
              <RecentRepairs repairJobs={repairJobs} branches={branches} />
            </div>
          </div>
        )}

        {/* Branch Details */}
        {currentPage === "branch_details" && selectedBranch && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">{selectedBranch.name}</h2>
                <p className="text-muted-foreground">จัดการงานซ่อมและสต็อกสินค้า</p>
              </div>
              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Wrench className="w-4 h-4 mr-2" />
                      เพิ่มรายการซ่อม
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>เพิ่มรายการซ่อม</DialogTitle>
                      <DialogDescription>กรอกรายละเอียดงานซ่อมและข้อมูลลูกค้า</DialogDescription>
                    </DialogHeader>
                    <RepairJobForm onSubmit={handleAddOrUpdateRepairJob} onClose={() => {}} error={modalError} />
                  </DialogContent>
                </Dialog>
                <Button variant="outline" onClick={() => setCurrentPage("stock_management")}>
                  <Package className="w-4 h-4 mr-2" />
                  จัดการสต็อก
                </Button>
              </div>
            </div>

            {/* Branch Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">รายได้สาขานี้</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ฿
                    {selectedBranchJobs
                      .filter((job) => job.status === "completed")
                      .reduce((sum, job) => sum + (job.estimatedPrice || 0), 0)
                      .toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">งานซ่อมทั้งหมด</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{selectedBranchJobs.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">งานเสร็จสิ้น</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {selectedBranchJobs.filter((job) => job.status === "completed").length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">กำลังดำเนินการ</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {selectedBranchJobs.filter((job) => job.status === "in_progress").length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Repair Jobs List */}
            <Card>
              <CardHeader>
                <CardTitle>รายการซ่อม</CardTitle>
                <CardDescription>งานซ่อมทั้งหมดของสาขานี้</CardDescription>
              </CardHeader>
              <CardContent>
                {selectedBranchJobs.length > 0 ? (
                  <div className="space-y-4">
                    {selectedBranchJobs.map((job) => (
                      <Card key={job.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-3 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold flex items-center gap-2">
                                  <Smartphone className="w-4 h-4" />
                                  {job.customerName}
                                </h4>
                                <Badge variant="secondary" className="flex items-center gap-1">
                                  <DollarSign className="w-3 h-3" />฿{job.estimatedPrice?.toLocaleString() || 0}
                                </Badge>
                                <Badge
                                  variant={job.status === "completed" ? "default" : "outline"}
                                  className="flex items-center gap-1"
                                >
                                  {job.status === "completed" ? (
                                    <CheckCircle className="w-3 h-3" />
                                  ) : (
                                    <Clock className="w-3 h-3" />
                                  )}
                                  {job.status === "completed" ? "เสร็จสิ้น" : "กำลังดำเนินการ"}
                                </Badge>
                                {job.isUnderWarranty && (
                                  <Badge variant="destructive" className="flex items-center gap-1">
                                    <Shield className="w-3 h-3" />
                                    ประกัน
                                  </Badge>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                                <p className="flex items-center gap-2">
                                  <Smartphone className="w-4 h-4" />
                                  <span className="font-medium">รุ่น:</span> {job.phoneModel || "ไม่ระบุ"}
                                </p>
                                <p className="flex items-center gap-2">
                                  <Wrench className="w-4 h-4" />
                                  <span className="font-medium">ช่างซ่อม:</span> {job.technicianName}
                                </p>
                                <p className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  <span className="font-medium">วันที่รับ:</span>{" "}
                                  {new Date(job.dateReceived).toLocaleDateString("th-TH")}
                                </p>
                                <p className="flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  <span className="font-medium">คาดเสร็จ:</span>{" "}
                                  {new Date(job.expectedCompletionDate).toLocaleDateString("th-TH")}
                                </p>
                              </div>

                              <div className="text-sm text-muted-foreground">
                                <p className="flex items-start gap-2">
                                  <FileText className="w-4 h-4 mt-0.5" />
                                  <span>
                                    <span className="font-medium">อาการ:</span> {job.symptoms}
                                  </span>
                                </p>
                              </div>

                              {/* Images Display */}
                              {job.images && job.images.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-sm font-medium flex items-center gap-2">
                                    <Camera className="w-4 h-4" />
                                    รูปภาพประกอบ ({job.images.length} รูป)
                                  </p>
                                  <div className="flex gap-2 overflow-x-auto pb-2">
                                    {job.images.map((image, index) => (
                                      <img
                                        key={index}
                                        src={image || "/placeholder.svg"}
                                        alt={`รูปที่ ${index + 1}`}
                                        className="w-16 h-16 object-cover rounded-lg border cursor-pointer hover:scale-105 transition-transform"
                                        onClick={() => {
                                          // Open image in new tab for full view
                                          window.open(image, "_blank")
                                        }}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1 ml-4">
                              {job.status === "in_progress" && (
                                <Button variant="outline" size="sm" onClick={() => handleCompleteRepair(job)}>
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              )}
                              {job.status === "completed" && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <FileText className="w-4 h-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-md">
                                    <DialogHeader>
                                      <DialogTitle>ใบแจ้งซ่อมออนไลน์</DialogTitle>
                                    </DialogHeader>
                                    <RepairReceipt job={job} branch={selectedBranch} />
                                  </DialogContent>
                                </Dialog>
                              )}
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>แก้ไขรายการซ่อม</DialogTitle>
                                  </DialogHeader>
                                  <RepairJobForm
                                    onSubmit={handleAddOrUpdateRepairJob}
                                    onClose={() => {}}
                                    error={modalError}
                                    initialData={job}
                                  />
                                </DialogContent>
                              </Dialog>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>ยืนยันการลบ</DialogTitle>
                                    <DialogDescription>
                                      คุณแน่ใจหรือไม่ว่าต้องการลบรายการซ่อมของ "{job.customerName}"?
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="flex justify-end gap-2">
                                    <DialogTrigger asChild>
                                      <Button variant="outline">ยกเลิก</Button>
                                    </DialogTrigger>
                                    <Button variant="destructive" onClick={() => handleDeleteRepairJob(job)}>
                                      ยืนยันการลบ
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Wrench className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>ยังไม่มีรายการซ่อม</p>
                    <p className="text-sm">คลิก "เพิ่มรายการซ่อม" เพื่อเริ่มต้น</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stock Management */}
        {currentPage === "stock_management" && selectedBranch && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">จัดการสต็อก: {selectedBranch.name}</h2>
                <p className="text-muted-foreground">เพิ่ม แก้ไข และจัดการสินค้าคงคลัง</p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    เพิ่มสินค้าเข้าสต็อก
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>เพิ่มสินค้าเข้าสต็อก</DialogTitle>
                    <DialogDescription>กรอกรายละเอียดสินค้าที่ต้องการเพิ่ม</DialogDescription>
                  </DialogHeader>
                  <StockForm onSubmit={handleAddOrUpdateStockItem} onClose={() => {}} />
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>รายการสต็อกสินค้า</CardTitle>
                <CardDescription>สินค้าคงคลังทั้งหมดของสาขานี้</CardDescription>
              </CardHeader>
              <CardContent>
                {selectedBranchStock.length > 0 ? (
                  <div className="space-y-4">
                    {selectedBranchStock.map((item) => (
                      <Card key={item.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-semibold">{item.name}</h4>
                              <p className="text-sm text-muted-foreground">จำนวนคงเหลือ: {item.quantity} ชิ้น</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  item.quantity > 10 ? "default" : item.quantity > 5 ? "secondary" : "destructive"
                                }
                              >
                                {item.quantity} ชิ้น
                              </Badge>
                              <div className="flex gap-1">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>แก้ไขสต็อก: {item.name}</DialogTitle>
                                    </DialogHeader>
                                    <StockForm
                                      onSubmit={handleAddOrUpdateStockItem}
                                      onClose={() => {}}
                                      initialData={item}
                                    />
                                  </DialogContent>
                                </Dialog>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>ยืนยันการลบ</DialogTitle>
                                      <DialogDescription>
                                        คุณแน่ใจหรือไม่ว่าต้องการลบสินค้า "{item.name}"? การกระทำนี้ไม่สามารถย้อนกลับได้
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="flex justify-end gap-2">
                                      <DialogTrigger asChild>
                                        <Button variant="outline">ยกเลิก</Button>
                                      </DialogTrigger>
                                      <Button variant="destructive" onClick={() => handleDeleteStockItem(item.id)}>
                                        ยืนยันการลบ
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>ยังไม่มีสินค้าในสต็อก</p>
                    <p className="text-sm">คลิก "เพิ่มสินค้าเข้าสต็อก" เพื่อเริ่มต้น</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
