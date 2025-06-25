"use client"

import { useState, useEffect, useMemo, type FC, type FormEvent } from "react"

// --- Firebase Imports ---
import { db, auth } from "@/lib/firebase"
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  runTransaction,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
} from "firebase/firestore"
import { onAuthStateChanged, signOut, signInAnonymously, type User } from "firebase/auth"

// --- UI Components ---
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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

interface UsedItem {
  stockId: string
  name: string
  quantity: number
}

interface RepairJob {
  id: string
  branchId: string
  description: string
  price: number
  itemsUsed: UsedItem[]
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
  const { totalRevenue, totalRepairs, stockSummary, selectedBranchStock, selectedBranchJobs } = useMemo(() => {
    const totalRevenue = repairJobs.reduce((sum, job) => sum + (job.price || 0), 0)
    const totalRepairs = repairJobs.length

    const stockSummary = stock.reduce(
      (acc, item) => {
        acc[item.name] = (acc[item.name] || 0) + item.quantity
        return acc
      },
      {} as { [key: string]: number },
    )

    const selectedBranchStock = stock.filter((item) => item.branchId === selectedBranch?.id)
    const selectedBranchJobs = repairJobs.filter((job) => job.branchId === selectedBranch?.id)

    return {
      totalRevenue,
      totalRepairs,
      stockSummary,
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
    description: string,
    price: number,
    itemsUsed: UsedItem[],
    jobToUpdate?: RepairJob,
  ) => {
    if (!selectedBranch || !description) {
      return setModalError("กรุณากรอกข้อมูลให้ครบถ้วน")
    }

    const oldMap = new Map<string, number>()
    jobToUpdate?.itemsUsed.forEach((i) => oldMap.set(i.stockId, i.quantity))

    const newMap = new Map<string, number>()
    itemsUsed.forEach((i) => newMap.set(i.stockId, i.quantity))

    const allIds = new Set([...oldMap.keys(), ...newMap.keys()])

    try {
      await runTransaction(db, async (tx) => {
        const stockOps = await Promise.all(
          Array.from(allIds).map(async (id) => {
            const ref = doc(db, "stock", id)
            const snap = await tx.get(ref)
            if (!snap.exists()) throw new Error(`ไม่พบสินค้า ID: ${id}`)

            const cur = snap.data().quantity as number
            const oldQ = oldMap.get(id) ?? 0
            const newQ = newMap.get(id) ?? 0
            const delta = oldQ - newQ

            if (delta < 0 && cur < -delta) {
              throw new Error(`สินค้า '${snap.data().name}' ไม่เพียงพอ`)
            }
            return { ref, newQty: cur + delta }
          }),
        )

        if (jobToUpdate) {
          tx.update(doc(db, "repairJobs", jobToUpdate.id), {
            description,
            price,
            itemsUsed,
          })
        } else {
          tx.set(doc(collection(db, "repairJobs")), {
            branchId: selectedBranch.id,
            description,
            price,
            itemsUsed,
            createdAt: new Date().toISOString(),
          })
        }

        stockOps.forEach(({ ref, newQty }) => tx.update(ref, { quantity: newQty }))
      })

      closeModal()
    } catch (e: any) {
      console.error("Transaction failed:", e)
      setModalError(e.message)
    }
  }

  const handleDeleteRepairJob = async (job: RepairJob) => {
    if (!job) return
    try {
      await runTransaction(db, async (tx) => {
        const stockRestorePromises = job.itemsUsed.map(async (item) => {
          const ref = doc(db, "stock", item.stockId)
          const snap = await tx.get(ref)
          if (!snap.exists()) {
            console.warn(`Stock item ${item.name} (ID: ${item.stockId}) not found for restoration.`)
            return null
          }
          return { ref, newQuantity: snap.data().quantity + item.quantity }
        })
        const stockToRestore = (await Promise.all(stockRestorePromises)).filter(Boolean)

        const jobRef = doc(db, "repairJobs", job.id)
        tx.delete(jobRef)
        stockToRestore.forEach((update) => {
          if (update) tx.update(update.ref, { quantity: update.newQuantity })
        })
      })
      closeModal()
    } catch (e: any) {
      console.error("Delete transaction failed:", e)
      setModalError(e.message)
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
                onKeyPress={(e ) => e.key === "Enter" && handleLogin()}
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
                  <p className="text-xs text-muted-foreground">จากงานซ่อมทั้งหมด</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">จำนวนงานซ่อม</CardTitle>
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalRepairs.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">งานที่เสร็จสิ้นแล้ว</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">จำนวนสาขา</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{branches.length}</div>
                  <p className="text-xs text-muted-foreground">สาขาที่เปิดให้บริการ</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">รายการสต็อก</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Object.keys(stockSummary).length}</div>
                  <p className="text-xs text-muted-foreground">ประเภทสินค้าทั้งหมด</p>
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

              {/* Recent Repairs & Stock Summary */}
              <div className="space-y-6">
                {/* Recent Repairs */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      รายการซ่อมล่าสุด
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-48">
                      {repairJobs.length > 0 ? (
                        <div className="space-y-3">
                          {repairJobs.slice(0, 5).map((job) => (
                            <div key={job.id} className="flex justify-between items-start p-3 rounded-lg bg-muted/50">
                              <div className="space-y-1">
                                <p className="font-medium text-sm">{job.description}</p>
                                <p className="text-xs text-muted-foreground">
                                  สาขา: {branches.find((b) => b.id === job.branchId)?.name || "N/A"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(job.createdAt).toLocaleDateString("th-TH")}
                                </p>
                              </div>
                              <Badge variant="secondary">฿{job.price?.toLocaleString() || 0}</Badge>
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

                {/* Stock Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      สรุปสต็อกคงคลัง
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-48">
                      {Object.keys(stockSummary).length > 0 ? (
                        <div className="space-y-2">
                          {Object.entries(stockSummary).map(([name, qty]) => (
                            <div key={name} className="flex justify-between items-center p-2 rounded bg-muted/30">
                              <span className="text-sm font-medium">{name}</span>
                              <Badge variant={qty > 10 ? "default" : qty > 5 ? "secondary" : "destructive"}>
                                {qty} ชิ้น
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">ไม่มีสินค้าในสต็อก</p>
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
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
                      <DialogDescription>กรอกรายละเอียดงานซ่อมและเลือกอุปกรณ์ที่ใช้</DialogDescription>
                    </DialogHeader>
                    <RepairJobForm
                      selectedBranchStock={selectedBranchStock}
                      onSubmit={handleAddOrUpdateRepairJob}
                      onClose={closeModal}
                      error={modalError}
                    />
                  </DialogContent>
                </Dialog>
                <Button variant="outline" onClick={() => setCurrentPage("stock_management")}>
                  <Package className="w-4 h-4 mr-2" />
                  จัดการสต็อก
                </Button>
              </div>
            </div>

            {/* Branch Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">รายได้สาขานี้</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ฿{selectedBranchJobs.reduce((sum, job) => sum + (job.price || 0), 0).toLocaleString()}
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
                  <CardTitle className="text-sm font-medium">รายการสต็อก</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{selectedBranchStock.length}</div>
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
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{job.description}</h4>
                                <Badge variant="secondary">฿{job.price?.toLocaleString() || 0}</Badge>
                              </div>
                              {job.itemsUsed.length > 0 && (
                                <div className="text-sm text-muted-foreground">
                                  <span className="font-medium">อุปกรณ์ที่ใช้: </span>
                                  {job.itemsUsed.map((item, index) => (
                                    <span key={item.stockId}>
                                      {item.name} ({item.quantity} ชิ้น)
                                      {index < job.itemsUsed.length - 1 && ", "}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {new Date(job.createdAt).toLocaleString("th-TH")}
                              </p>
                            </div>
                            <div className="flex gap-1">
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
                                    selectedBranchStock={selectedBranchStock}
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
                                      คุณแน่ใจหรือไม่ว่าต้องการลบรายการซ่อม "{job.description}"?
                                      การกระทำนี้จะคืนสต็อกสินค้าที่ใช้ไปกลับเข้าระบบ
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
  selectedBranchStock: StockItem[]
  onSubmit: (description: string, price: number, itemsUsed: UsedItem[], job?: RepairJob) => void
  onClose: () => void
  error?: string
  initialData?: RepairJob
}> = ({ selectedBranchStock, onSubmit, onClose, error, initialData }) => {
  const [description, setDescription] = useState(initialData?.description || "")
  const [price, setPrice] = useState(initialData?.price || 0)
  const [itemsUsed, setItemsUsed] = useState<UsedItem[]>(initialData?.itemsUsed || [])

  const handleItemUsageChange = (stockItem: StockItem, quantity: number) => {
    const safeQuantity = Math.max(0, Math.min(quantity, stockItem.quantity))

    setItemsUsed((prev) => {
      if (safeQuantity === 0) {
        return prev.filter((i) => i.stockId !== stockItem.id)
      }
      const rest = prev.filter((i) => i.stockId !== stockItem.id)
      return [...rest, { stockId: stockItem.id, name: stockItem.name, quantity: safeQuantity }]
    })
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (description.trim() && price >= 0) {
      onSubmit(description.trim(), price, itemsUsed, initialData)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="repair-description">รายละเอียดงานซ่อม</Label>
        <Input
          id="repair-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="เช่น เปลี่ยนหน้าจอ iPhone 12"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="repair-price">ราคาซ่อม (บาท)</Label>
        <Input
          id="repair-price"
          type="number"
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          placeholder="0"
          min="0"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>อุปกรณ์ที่ใช้</Label>
        <ScrollArea className="h-48 border rounded-md p-3">
          {selectedBranchStock.length > 0 ? (
            <div className="space-y-3">
              {selectedBranchStock.map((item) => {
                const itemInUse = itemsUsed.find((i) => i.stockId === item.id)
                const availableQty = item.quantity + (itemInUse?.quantity || 0)

                return (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">มี {availableQty} ชิ้น</p>
                    </div>
                    <div className="w-20">
                      <Input
                        type="number"
                        min={0}
                        max={availableQty}
                        value={itemInUse?.quantity || 0}
                        onChange={(e) => handleItemUsageChange(item, Number(e.target.value))}
                        className="text-center"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">ไม่มีสินค้าในสต็อก</p>
          )}
        </ScrollArea>
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
