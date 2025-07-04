"use client"

import { useState, useEffect, useMemo, type FC, type FormEvent } from "react"

// --- Firebase Imports ---
import { db, auth } from "@/lib/firebase"
import { collection, onSnapshot, addDoc, doc, query, orderBy, updateDoc, deleteDoc } from "firebase/firestore"
import { onAuthStateChanged, signOut, signInAnonymously, type User } from "firebase/auth"

// --- UI Components ---
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"

// --- Icons ---
import {
  Wrench,
  Package,
  ArrowLeft,
  Edit,
  Trash2,
  Plus,
  Building2,
  TrendingUp,
  BarChart3,
  Eye,
  LogOut,
  AlertCircle,
  FileText,
  CheckCircle,
  Clock,
} from "lucide-react"

// --- TYPE DEFINITIONS ---
interface Branch {
  id: string
  name: string
}

interface StockItem {
  id: string
  branchId: string
  name: string
  quantity: number
}

interface RepairJob {
  id: string
  branchId: string
  customerName: string
  dateReceived: string
  symptoms: string
  estimatedPrice: number
  isUnderWarranty: boolean
  technicianName: string
  expectedCompletionDate: string
  status: "in_progress" | "completed"
  createdAt: string
}

type Page = "main" | "branch_details" | "stock_management"
type ModalType =
  | "add_branch"
  | "add_stock"
  | "edit_stock"
  | "delete_stock"
  | "add_repair"
  | "edit_repair"
  | "delete_repair"
  | "view_receipt"
  | null

interface ModalState {
  type: ModalType
  data?: any
}

export default function IProDashboard() {
  // --- STATE MANAGEMENT ---
  const [user, setUser] = useState<User | null>(null)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  const [branches, setBranches] = useState<Branch[]>([])
  const [stock, setStock] = useState<StockItem[]>([])
  const [repairJobs, setRepairJobs] = useState<RepairJob[]>([])

  const [currentPage, setCurrentPage] = useState<Page>("main")
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [modal, setModal] = useState<ModalState>({ type: null })
  const [modalError, setModalError] = useState("")

  // --- AUTHENTICATION & DATA FETCHING HOOKS ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) {
      setBranches([])
      setStock([])
      setRepairJobs([])
      return
    }

    const unsubscribers = [
      onSnapshot(collection(db, "branches"), (snapshot) =>
        setBranches(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Branch)),
      ),
      onSnapshot(collection(db, "stock"), (snapshot) =>
        setStock(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as StockItem)),
      ),
      onSnapshot(query(collection(db, "repairJobs"), orderBy("createdAt", "desc")), (snapshot) =>
        setRepairJobs(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as RepairJob)),
      ),
    ]

    return () => unsubscribers.forEach((unsub) => unsub())
  }, [user])

  // --- DATA DERIVATION (MEMOIZED) ---
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

  // --- HANDLERS ---
  const handleLogin = async () => {
    if (password === "1234") {
      setError("")
      setLoading(true)
      try {
        await signInAnonymously(auth)
      } catch (err) {
        console.error("Firebase Sign-In Error:", err)
        setError("การเชื่อมต่อล้มเหลว กรุณาลองใหม่")
        setLoading(false)
      }
    } else {
      setError("รหัสผ่านไม่ถูกต้อง")
    }
  }

  const handleLogout = async () => {
    await signOut(auth)
    setCurrentPage("main")
    setSelectedBranch(null)
  }

  const openModal = (type: ModalType, data?: any) => {
    setModal({ type, data })
    setModalError("")
  }

  const closeModal = () => {
    setModal({ type: null })
    setModalError("")
  }

  const handleAddBranch = async (branchName: string) => {
    if (branchName) {
      await addDoc(collection(db, "branches"), { name: branchName })
      closeModal()
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
    closeModal()
  }

  const handleDeleteStockItem = async (stockId: string) => {
    if (!stockId) return
    await deleteDoc(doc(db, "stock", stockId))
    closeModal()
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
      closeModal()
    } catch (e: any) {
      console.error("Failed to save repair job:", e)
      setModalError(e.message)
    }
  }

  const handleDeleteRepairJob = async (job: RepairJob) => {
    if (!job) return
    try {
      await deleteDoc(doc(db, "repairJobs", job.id))
      closeModal()
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

  // --- RENDER LOGIC ---
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

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-primary rounded-full flex items-center justify-center">
              <Wrench className="w-6 h-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">I-PRO Dashboard</CardTitle>
            <CardDescription>ระบบจัดการร้านซ่อมมือถือ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">รหัสผ่าน</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                placeholder="กรุณาใส่รหัสผ่าน"
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button onClick={handleLogin} className="w-full">
              เข้าสู่ระบบ
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Wrench className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold">I-PRO Dashboard</h1>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            ออกจากระบบ
          </Button>
        </div>
      </header>

      <main className="container py-6">
        {/* Navigation Breadcrumb */}
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
            {/* Header Section */}
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
                  <AddBranchForm onSubmit={handleAddBranch} onClose={closeModal} />
                </DialogContent>
              </Dialog>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">รายได้รวม</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">฿{totalRevenue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">จากงานซ่อมที่เสร็จแล้ว</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">งานซ่อมทั้งหมด</CardTitle>
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalRepairs.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">รวมทุกสถานะ</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">งานเสร็จสิ้น</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{completedRepairs}</div>
                  <p className="text-xs text-muted-foreground">งานที่เสร็จแล้ว</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">กำลังดำเนินการ</CardTitle>
                  <Clock className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{inProgressRepairs}</div>
                  <p className="text-xs text-muted-foreground">งานที่ยังไม่เสร็จ</p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Branches Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    สาขาทั้งหมด
                  </CardTitle>
                  <CardDescription>คลิกที่สาขาเพื่อดูรายละเอียดและจัดการ</CardDescription>
                </CardHeader>
                <CardContent>
                  {branches.length > 0 ? (
                    <div className="grid gap-3">
                      {branches.map((branch) => (
                        <Card
                          key={branch.id}
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => {
                            setSelectedBranch(branch)
                            setCurrentPage("branch_details")
                          }}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold">{branch.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  งานซ่อม: {repairJobs.filter((job) => job.branchId === branch.id).length} รายการ
                                </p>
                              </div>
                              <Eye className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>ยังไม่มีสาขา</p>
                      <p className="text-sm">คลิก "เพิ่มสาขาใหม่" เพื่อเริ่มต้น</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Repairs */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    รายการซ่อมล่าสุด
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    {repairJobs.length > 0 ? (
                      <div className="space-y-3">
                        {repairJobs.slice(0, 10).map((job) => (
                          <div key={job.id} className="flex justify-between items-start p-3 rounded-lg bg-muted/50">
                            <div className="space-y-1">
                              <p className="font-medium text-sm">{job.customerName}</p>
                              <p className="text-xs text-muted-foreground">{job.symptoms}</p>
                              <p className="text-xs text-muted-foreground">
                                สาขา: {branches.find((b) => b.id === job.branchId)?.name || "N/A"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(job.dateReceived).toLocaleDateString("th-TH")}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge variant="secondary">฿{job.estimatedPrice?.toLocaleString() || 0}</Badge>
                              <Badge variant={job.status === "completed" ? "default" : "outline"}>
                                {job.status === "completed" ? "เสร็จสิ้น" : "กำลังดำเนินการ"}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Wrench className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">ยังไม่มีรายการซ่อม</p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Branch Details Page */}
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
                    <RepairJobForm onSubmit={handleAddOrUpdateRepairJob} onClose={closeModal} error={modalError} />
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
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold">{job.customerName}</h4>
                                <Badge variant="secondary">฿{job.estimatedPrice?.toLocaleString() || 0}</Badge>
                                <Badge variant={job.status === "completed" ? "default" : "outline"}>
                                  {job.status === "completed" ? "เสร็จสิ้น" : "กำลังดำเนินการ"}
                                </Badge>
                                {job.isUnderWarranty && <Badge variant="destructive">ประกัน</Badge>}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                                <p>
                                  <span className="font-medium">อาการ:</span> {job.symptoms}
                                </p>
                                <p>
                                  <span className="font-medium">ช่างซ่อม:</span> {job.technicianName}
                                </p>
                                <p>
                                  <span className="font-medium">วันที่รับ:</span>{" "}
                                  {new Date(job.dateReceived).toLocaleDateString("th-TH")}
                                </p>
                                <p>
                                  <span className="font-medium">คาดเสร็จ:</span>{" "}
                                  {new Date(job.expectedCompletionDate).toLocaleDateString("th-TH")}
                                </p>
                              </div>
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
                                    onClose={closeModal}
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

        {/* Stock Management Page */}
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
                  <StockForm onSubmit={handleAddOrUpdateStockItem} onClose={closeModal} />
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
                                      onClose={closeModal}
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

// Form Components
const AddBranchForm: FC<{
  onSubmit: (name: string) => void
  onClose: () => void
}> = ({ onSubmit, onClose }) => {
  const [name, setName] = useState("")

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onSubmit(name.trim())
      setName("")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="branch-name">ชื่อสาขา</Label>
        <Input
          id="branch-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="กรอกชื่อสาขา"
          required
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          ยกเลิก
        </Button>
        <Button type="submit">บันทึก</Button>
      </div>
    </form>
  )
}

const StockForm: FC<{
  onSubmit: (name: string, quantity: number, id?: string) => void
  onClose: () => void
  initialData?: StockItem
}> = ({ onSubmit, onClose, initialData }) => {
  const [name, setName] = useState(initialData?.name || "")
  const [quantity, setQuantity] = useState(initialData?.quantity || 1)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (name.trim() && quantity > 0) {
      onSubmit(name.trim(), quantity, initialData?.id)
      if (!initialData) {
        setName("")
        setQuantity(1)
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!initialData && (
        <div className="space-y-2">
          <Label htmlFor="stock-name">ชื่อสินค้า</Label>
          <Input
            id="stock-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="กรอกชื่อสินค้า"
            required
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="stock-quantity">จำนวน</Label>
        <Input
          id="stock-quantity"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          placeholder="กรอกจำนวน"
          min="1"
          required
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          ยกเลิก
        </Button>
        <Button type="submit">บันทึก</Button>
      </div>
    </form>
  )
}

const RepairJobForm: FC<{
  onSubmit: (repairData: Omit<RepairJob, "id" | "branchId" | "createdAt">, job?: RepairJob) => void
  onClose: () => void
  error?: string
  initialData?: RepairJob
}> = ({ onSubmit, onClose, error, initialData }) => {
  const [customerName, setCustomerName] = useState(initialData?.customerName || "")
  const [dateReceived, setDateReceived] = useState(initialData?.dateReceived || new Date().toISOString().split("T")[0])
  const [symptoms, setSymptoms] = useState(initialData?.symptoms || "")
  const [estimatedPrice, setEstimatedPrice] = useState(initialData?.estimatedPrice || 0)
  const [isUnderWarranty, setIsUnderWarranty] = useState(initialData?.isUnderWarranty || false)
  const [technicianName, setTechnicianName] = useState(initialData?.technicianName || "")
  const [expectedCompletionDate, setExpectedCompletionDate] = useState(
    initialData?.expectedCompletionDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  )
  const [status, setStatus] = useState<"in_progress" | "completed">(initialData?.status || "in_progress")

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (customerName.trim() && symptoms.trim() && technicianName.trim()) {
      onSubmit(
        {
          customerName: customerName.trim(),
          dateReceived,
          symptoms: symptoms.trim(),
          estimatedPrice,
          isUnderWarranty,
          technicianName: technicianName.trim(),
          expectedCompletionDate,
          status,
        },
        initialData,
      )
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="customer-name">ชื่อลูกค้า *</Label>
          <Input
            id="customer-name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="กรอกชื่อลูกค้า"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="date-received">วันที่รับแจ้ง *</Label>
          <Input
            id="date-received"
            type="date"
            value={dateReceived}
            onChange={(e) => setDateReceived(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="symptoms">อาการ/ปัญหา *</Label>
        <Textarea
          id="symptoms"
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          placeholder="อธิบายอาการหรือปัญหาที่พบ"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="estimated-price">ราคาประเมิน (บาท) *</Label>
          <Input
            id="estimated-price"
            type="number"
            value={estimatedPrice}
            onChange={(e) => setEstimatedPrice(Number(e.target.value))}
            placeholder="0"
            min="0"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="warranty-status">สถานะประกัน</Label>
          <Select value={isUnderWarranty ? "yes" : "no"} onValueChange={(value) => setIsUnderWarranty(value === "yes")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no">ไม่อยู่ในประกัน</SelectItem>
              <SelectItem value="yes">อยู่ในประกัน</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="technician-name">ชื่อช่างซ่อม *</Label>
          <Input
            id="technician-name"
            value={technicianName}
            onChange={(e) => setTechnicianName(e.target.value)}
            placeholder="กรอกชื่อช่างซ่อม"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expected-completion">วันคาดการเสร็จ *</Label>
          <Input
            id="expected-completion"
            type="date"
            value={expectedCompletionDate}
            onChange={(e) => setExpectedCompletionDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="repair-status">สถานะการซ่อม</Label>
        <Select value={status} onValueChange={(value: "in_progress" | "completed") => setStatus(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="in_progress">กำลังดำเนินการ</SelectItem>
            <SelectItem value="completed">เสร็จสิ้น</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          ยกเลิก
        </Button>
        <Button type="submit">บันทึก</Button>
      </div>
    </form>
  )
}

const RepairReceipt: FC<{
  job: RepairJob
  branch: Branch
}> = ({ job, branch }) => {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-4">
      <div className="text-center border-b pb-4">
        <h3 className="text-lg font-bold">ใบแจ้งซ่อมออนไลน์</h3>
        <p className="text-sm text-muted-foreground">{branch.name}</p>
      </div>

      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="font-medium">ชื่อลูกค้า:</span>
          </div>
          <div>{job.customerName}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="font-medium">วันที่รับแจ้ง:</span>
          </div>
          <div>{new Date(job.dateReceived).toLocaleDateString("th-TH")}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="font-medium">อาการ:</span>
          </div>
          <div>{job.symptoms}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="font-medium">ราคา:</span>
          </div>
          <div>฿{job.estimatedPrice.toLocaleString()}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="font-medium">ประกัน:</span>
          </div>
          <div>{job.isUnderWarranty ? "อยู่ในประกัน" : "ไม่อยู่ในประกัน"}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="font-medium">ช่างซ่อม:</span>
          </div>
          <div>{job.technicianName}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="font-medium">วันคาดเสร็จ:</span>
          </div>
          <div>{new Date(job.expectedCompletionDate).toLocaleDateString("th-TH")}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="font-medium">สถานะ:</span>
          </div>
          <div>
            <Badge variant={job.status === "completed" ? "default" : "outline"}>
              {job.status === "completed" ? "เสร็จสิ้น" : "กำลังดำเนินการ"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-muted-foreground border-t pt-4">
        <p>ขอบคุณที่ใช้บริการ</p>
        <p>พิมพ์เมื่อ: {new Date().toLocaleString("th-TH")}</p>
      </div>

      <div className="flex justify-end">
        <Button onClick={handlePrint} size="sm">
          <FileText className="w-4 h-4 mr-2" />
          พิมพ์ใบแจ้งซ่อม
        </Button>
      </div>
    </div>
  )
}
