"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import {
	Gauge,
	Trophy,
	Users,
	UserCheck,
	ListChecks,
	Medal,
	ClipboardList,
} from "lucide-react";

const navItems = [
	{ href: "/admin/dashboard", label: "Dashboard", icon: Gauge },
	{ href: "/admin/events", label: "Events", icon: Trophy },
	{ href: "/admin/contestants", label: "Contestants", icon: Users },
	{ href: "/admin/judges", label: "Judges", icon: UserCheck },
	{ href: "/admin/criteria", label: "Criteria", icon: ListChecks },
	{ href: "/admin/scores", label: "Scores", icon: ClipboardList },
	{ href: "/admin/results", label: "Results", icon: Medal },
];

export function AdminNav() {
			const pathname = usePathname();
				return (
					<aside className="sticky top-10 h-auto w-48 p-4 flex flex-col gap-2 items-stretch shadow-lg border-r bg-background rounded-xl z-10">
					<nav className="flex flex-col gap-2">
						{navItems.map((item) => {
							const Icon = item.icon;
							const isActive = pathname === item.href || (item.href === "/admin/dashboard" && pathname === "/admin");
							return (
								<Button
									asChild
									key={item.href}
									variant={isActive ? "default" : "outline"}
									className={
										"w-full flex items-center gap-2 justify-start px-3 py-2 rounded-md text-sm font-medium transition-colors" +
										(isActive ? " border-primary ring-2 ring-primary" : "")
									}
								>
									<Link href={item.href}>
										{Icon && <Icon className="w-4 h-4 mr-2" />}
										<span>{item.label}</span>
									</Link>
								</Button>
							);
						})}
					</nav>
				</aside>
			);
}