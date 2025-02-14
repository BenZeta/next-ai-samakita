"use client";

import Link from "next/link";
import { Building2, Receipt, Users, CreditCard } from "lucide-react";

const stats = [
  {
    name: "Total Properties",
    value: "12",
    change: "+2",
    changeType: "increase",
    href: "/properties",
    icon: Building2,
  },
  {
    name: "Active Tenants",
    value: "45",
    change: "+5",
    changeType: "increase",
    href: "/tenants",
    icon: Users,
  },
  {
    name: "Monthly Expenses",
    value: "Rp 24.5M",
    change: "-12%",
    changeType: "decrease",
    href: "/expenses",
    icon: Receipt,
  },
  {
    name: "Outstanding Bills",
    value: "Rp 12.8M",
    change: "+8%",
    changeType: "increase",
    href: "/billing",
    icon: CreditCard,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">Welcome back! Here's an overview of your property management system.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.name}
              href={stat.href}
              className="group relative overflow-hidden rounded-lg bg-white p-6 shadow transition-all hover:shadow-lg">
              <div className="flex items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                </div>
              </div>
              <div className="mt-4">
                <div className={`inline-flex items-center text-sm font-medium ${stat.changeType === "increase" ? "text-green-600" : "text-red-600"}`}>
                  {stat.change}
                  <span className="ml-2">vs last month</span>
                </div>
              </div>
              <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-indigo-50 opacity-20 transition-transform group-hover:scale-150" />
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <p className="font-medium text-gray-900">New tenant check-in</p>
                <p className="text-sm text-gray-500">Room 203, Green View Apartment</p>
              </div>
              <span className="text-sm text-gray-500">2 hours ago</span>
            </div>
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <p className="font-medium text-gray-900">Maintenance request completed</p>
                <p className="text-sm text-gray-500">AC repair in Room 105</p>
              </div>
              <span className="text-sm text-gray-500">5 hours ago</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Payment received</p>
                <p className="text-sm text-gray-500">Monthly rent from John Doe</p>
              </div>
              <span className="text-sm text-gray-500">1 day ago</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-medium text-gray-900">Upcoming Tasks</h2>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <p className="font-medium text-gray-900">Tenant contract renewal</p>
                <p className="text-sm text-gray-500">Room 301 - Due in 5 days</p>
              </div>
              <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">Pending</span>
            </div>
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <p className="font-medium text-gray-900">Property inspection</p>
                <p className="text-sm text-gray-500">Blue Sky Residence - Tomorrow</p>
              </div>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">Scheduled</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Bill payment reminder</p>
                <p className="text-sm text-gray-500">Electricity bill - Due today</p>
              </div>
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">Urgent</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
