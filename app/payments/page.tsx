"use client"

import { useState } from "react"
import { DollarSign, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"

export default function PaymentsPage() {
  const [settlements] = useState([
    {
      id: 1,
      from: { name: "Sarah", initials: "SM" },
      to: { name: "You", initials: "JD" },
      amount: 15.5,
      reason: "Groceries & Cleaning supplies",
      status: "pending",
      dueDate: "2024-01-20",
      method: "venmo",
    },
    {
      id: 2,
      from: { name: "Mike", initials: "MJ" },
      to: { name: "You", initials: "JD" },
      amount: 8.56,
      reason: "Cleaning supplies",
      status: "pending",
      dueDate: "2024-01-18",
      method: "paypal",
    },
    {
      id: 3,
      from: { name: "Emma", initials: "EW" },
      to: { name: "You", initials: "JD" },
      amount: 18.19,
      reason: "Internet bill share",
      status: "completed",
      dueDate: "2024-01-15",
      method: "cash",
      completedDate: "2024-01-14",
    },
    {
      id: 4,
      from: { name: "You", initials: "JD" },
      to: { name: "Sarah", initials: "SM" },
      amount: 31.88,
      reason: "Weekly groceries",
      status: "completed",
      dueDate: "2024-01-12",
      method: "venmo",
      completedDate: "2024-01-11",
    },
  ])

  const [paymentMethods] = useState([
    { id: "venmo", name: "Venmo", username: "@johndoe123" },
    { id: "paypal", name: "PayPal", username: "john@example.com" },
    { id: "zelle", name: "Zelle", username: "+1 (555) 123-4567" },
    { id: "cash", name: "Cash", username: "In person" },
  ])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) return "Today"
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow"
    return date.toLocaleDateString()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case "pending":
        return <Clock className="h-4 w-4 text-orange-600" />
      case "overdue":
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const pendingSettlements = settlements.filter((s) => s.status === "pending")
  const completedSettlements = settlements.filter((s) => s.status === "completed")
  const totalOwed = pendingSettlements.filter((s) => s.to.name === "You").reduce((sum, s) => sum + s.amount, 0)
  const totalYouOwe = pendingSettlements.filter((s) => s.from.name === "You").reduce((sum, s) => sum + s.amount, 0)

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <span className="text-xl font-bold">Flatastic</span>
              </Link>
              <span className="ml-4 text-muted-foreground">/</span>
              <span className="ml-4 font-medium">Payments</span>
            </div>
            <div className="flex items-center space-x-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Record Payment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                    <DialogDescription>Mark a payment as completed</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="settlement">Select Settlement</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a pending settlement" />
                        </SelectTrigger>
                        <SelectContent>
                          {pendingSettlements.map((settlement) => (
                            <SelectItem key={settlement.id} value={settlement.id.toString()}>
                              {settlement.from.name} owes {settlement.to.name} ${settlement.amount.toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="method">Payment Method</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="How was it paid?" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentMethods.map((method) => (
                            <SelectItem key={method.id} value={method.id}>
                              {method.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Textarea id="notes" placeholder="Add any additional notes..." />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline">Cancel</Button>
                    <Button>Record Payment</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Payments & Settlements</h1>
          <p className="text-muted-foreground">Track and manage payment settlements</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">You're Owed</CardTitle>
              <ArrowDownLeft className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">${totalOwed.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                From {pendingSettlements.filter((s) => s.to.name === "You").length} people
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">You Owe</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">${totalYouOwe.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                To {pendingSettlements.filter((s) => s.from.name === "You").length} people
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{pendingSettlements.length}</div>
              <p className="text-xs text-muted-foreground">Settlements waiting</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedSettlements.length}</div>
              <p className="text-xs text-muted-foreground">Completed payments</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Settlements Tabs */}
            <Tabs defaultValue="pending" className="space-y-6">
              <TabsList>
                <TabsTrigger value="pending">Pending ({pendingSettlements.length})</TabsTrigger>
                <TabsTrigger value="completed">Completed ({completedSettlements.length})</TabsTrigger>
                <TabsTrigger value="all">All Settlements</TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-4">
                {pendingSettlements.map((settlement) => (
                  <Card key={settlement.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>{settlement.from.initials}</AvatarFallback>
                            </Avatar>
                            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>{settlement.to.initials}</AvatarFallback>
                            </Avatar>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">
                                {settlement.from.name} owes {settlement.to.name}
                              </span>
                              {getStatusIcon(settlement.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">{settlement.reason}</p>
                            <p className="text-xs text-muted-foreground">Due {formatDate(settlement.dueDate)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">${settlement.amount.toFixed(2)}</div>
                          <Badge variant="outline" className="mt-1">
                            {paymentMethods.find((m) => m.id === settlement.method)?.name}
                          </Badge>
                          <div className="flex gap-2 mt-2">
                            <Button variant="outline" size="sm">
                              Remind
                            </Button>
                            <Button size="sm">Mark Paid</Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="completed" className="space-y-4">
                {completedSettlements.map((settlement) => (
                  <Card key={settlement.id} className="hover:shadow-md transition-shadow opacity-75">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>{settlement.from.initials}</AvatarFallback>
                            </Avatar>
                            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>{settlement.to.initials}</AvatarFallback>
                            </Avatar>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">
                                {settlement.from.name} paid {settlement.to.name}
                              </span>
                              {getStatusIcon(settlement.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">{settlement.reason}</p>
                            <p className="text-xs text-muted-foreground">
                              Completed on {formatDate(settlement.completedDate!)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">${settlement.amount.toFixed(2)}</div>
                          <Badge variant="outline" className="mt-1">
                            {paymentMethods.find((m) => m.id === settlement.method)?.name}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="all" className="space-y-4">
                {settlements.map((settlement) => (
                  <Card
                    key={settlement.id}
                    className={`hover:shadow-md transition-shadow ${settlement.status === "completed" ? "opacity-75" : ""}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>{settlement.from.initials}</AvatarFallback>
                            </Avatar>
                            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>{settlement.to.initials}</AvatarFallback>
                            </Avatar>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">
                                {settlement.from.name} {settlement.status === "completed" ? "paid" : "owes"}{" "}
                                {settlement.to.name}
                              </span>
                              {getStatusIcon(settlement.status)}
                              <Badge variant={settlement.status === "completed" ? "default" : "secondary"}>
                                {settlement.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{settlement.reason}</p>
                            <p className="text-xs text-muted-foreground">
                              {settlement.status === "completed"
                                ? `Completed on ${formatDate(settlement.completedDate!)}`
                                : `Due ${formatDate(settlement.dueDate)}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">${settlement.amount.toFixed(2)}</div>
                          <Badge variant="outline" className="mt-1">
                            {paymentMethods.find((m) => m.id === settlement.method)?.name}
                          </Badge>
                          {settlement.status === "pending" && (
                            <div className="flex gap-2 mt-2">
                              <Button variant="outline" size="sm">
                                Remind
                              </Button>
                              <Button size="sm">Mark Paid</Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Your connected payment accounts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {paymentMethods.map((method) => (
                  <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{method.name}</div>
                      <div className="text-sm text-muted-foreground">{method.username}</div>
                    </div>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </div>
                ))}
                <Button variant="outline" className="w-full bg-transparent">
                  Add Payment Method
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Send Reminder
                </Button>
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Settle All Debts
                </Button>
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Request Payment
                </Button>
              </CardContent>
            </Card>

            {/* Settlement Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Settlement Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Net Balance</span>
                  <span className={`font-bold ${totalOwed - totalYouOwe >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {totalOwed - totalYouOwe >= 0 ? "+" : ""}${(totalOwed - totalYouOwe).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending In</span>
                  <span className="font-semibold text-green-600">${totalOwed.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending Out</span>
                  <span className="font-semibold text-red-600">${totalYouOwe.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
