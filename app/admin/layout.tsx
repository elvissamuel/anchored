'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  BarChart3Icon,
  CrownIcon,
  LayoutDashboardIcon,
  MailIcon,
  MenuIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  UsersIcon,
  ListChecksIcon,
  UserRoundCogIcon,
  Gamepad2Icon,
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActiveExact = (href: string) => pathname === href;
  const isActivePrefix = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const Nav = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="space-y-1 flex flex-col px-3">
      <Link href="/admin" onClick={onNavigate}>
        <Button
          variant={isActiveExact('/admin') ? 'secondary' : 'ghost'}
          className={
            isActiveExact('/admin')
              ? 'w-full justify-start text-left !text-primary bg-secondary/30 hover:bg-secondary/50 dark:bg-secondary/60 dark:hover:bg-secondary/80 [&_svg]:!text-primary'
              : 'w-full justify-start text-left'
          }
        >
          <LayoutDashboardIcon className="h-4 w-4 mr-2" />
          {!isCollapsed && 'Dashboard'}
        </Button>
      </Link>

      <Link href="/admin/organization" onClick={onNavigate}>
        <Button
          variant={isActivePrefix('/admin/organization') ? 'secondary' : 'ghost'}
          className={
            isActivePrefix('/admin/organization')
              ? 'w-full justify-start text-left !text-primary bg-secondary/30 hover:bg-secondary/50 dark:bg-secondary/60 dark:hover:bg-secondary/80 [&_svg]:!text-primary'
              : 'w-full justify-start text-left'
          }
        >
          <CrownIcon className="h-4 w-4 mr-2" />
          {!isCollapsed && 'Organization'}
        </Button>
      </Link>

      <Link href="/admin/users" onClick={onNavigate}>
        <Button
          variant={isActivePrefix('/admin/users') ? 'secondary' : 'ghost'}
          className={
            isActivePrefix('/admin/users')
              ? 'w-full justify-start text-left !text-primary bg-secondary/30 hover:bg-secondary/50 dark:bg-secondary/60 dark:hover:bg-secondary/80 [&_svg]:!text-primary'
              : 'w-full justify-start text-left'
          }
        >
          <UsersIcon className="h-4 w-4 mr-2" />
          {!isCollapsed && 'Users'}
        </Button>
      </Link>

      <Link href="/admin/tasks" onClick={onNavigate}>
        <Button
          variant={isActivePrefix('/admin/tasks') ? 'secondary' : 'ghost'}
          className={
            isActivePrefix('/admin/tasks')
              ? 'w-full justify-start text-left !text-primary bg-secondary/30 hover:bg-secondary/50 dark:bg-secondary/60 dark:hover:bg-secondary/80 [&_svg]:!text-primary'
              : 'w-full justify-start text-left'
          }
        >
          <ListChecksIcon className="h-4 w-4 mr-2" />
          {!isCollapsed && 'Tasks'}
        </Button>
      </Link>

      <Link href="/admin/groups" onClick={onNavigate}>
        <Button
          variant={isActivePrefix('/admin/groups') ? 'secondary' : 'ghost'}
          className={
            isActivePrefix('/admin/groups')
              ? 'w-full justify-start text-left !text-primary bg-secondary/30 hover:bg-secondary/50 dark:bg-secondary/60 dark:hover:bg-secondary/80 [&_svg]:!text-primary'
              : 'w-full justify-start text-left'
          }
        >
          <UserRoundCogIcon className="h-4 w-4 mr-2" />
          {!isCollapsed && 'Groups'}
        </Button>
      </Link>

      <Link href="/admin/quizzes" onClick={onNavigate}>
        <Button
          variant={isActivePrefix('/admin/quizzes') ? 'secondary' : 'ghost'}
          className={
            isActivePrefix('/admin/quizzes')
              ? 'w-full justify-start text-left !text-primary bg-secondary/30 hover:bg-secondary/50 dark:bg-secondary/60 dark:hover:bg-secondary/80 [&_svg]:!text-primary'
              : 'w-full justify-start text-left'
          }
        >
          <BarChart3Icon className="h-4 w-4 mr-2" />
          {!isCollapsed && 'Quizzes'}
        </Button>
      </Link>

      <Link href="/admin/games/sessions" onClick={onNavigate}>
        <Button
          variant={isActivePrefix('/admin/games') ? 'secondary' : 'ghost'}
          className={
            isActivePrefix('/admin/games')
              ? 'w-full justify-start text-left !text-primary bg-secondary/30 hover:bg-secondary/50 dark:bg-secondary/60 dark:hover:bg-secondary/80 [&_svg]:!text-primary'
              : 'w-full justify-start text-left'
          }
        >
          <Gamepad2Icon className="h-4 w-4 mr-2" />
          {!isCollapsed && 'Games'}
        </Button>
      </Link>

      <Link href="/admin/leaderboard" onClick={onNavigate}>
        <Button
          variant={isActivePrefix('/admin/leaderboard') ? 'secondary' : 'ghost'}
          className={
            isActivePrefix('/admin/leaderboard')
              ? 'w-full justify-start text-left !text-primary bg-secondary/30 hover:bg-secondary/50 dark:bg-secondary/60 dark:hover:bg-secondary/80 [&_svg]:!text-primary'
              : 'w-full justify-start text-left'
          }
        >
          <BarChart3Icon className="h-4 w-4 mr-2" />
          {!isCollapsed && 'Leaderboard'}
        </Button>
      </Link>

      <Link href="/admin/messages" onClick={onNavigate}>
        <Button
          variant={isActivePrefix('/admin/messages') ? 'secondary' : 'ghost'}
          className={
            isActivePrefix('/admin/messages')
              ? 'w-full justify-start text-left !text-primary bg-secondary/30 hover:bg-secondary/50 dark:bg-secondary/60 dark:hover:bg-secondary/80 [&_svg]:!text-primary'
              : 'w-full justify-start text-left'
          }
        >
          <MailIcon className="h-4 w-4 mr-2" />
          {!isCollapsed && 'Messages'}
        </Button>
      </Link>
    </nav>
  );

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await axios.post('/api/auth/logout');
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0">
          <div className="p-6 border-b">
            <h1 className="text-xl font-bold text-primary">DiscipleHub</h1>
            <p className="text-xs text-gray-500 mt-1">Admin Dashboard</p>
          </div>
          <div className="py-3">
            <Nav onNavigate={() => setMobileOpen(false)} />
          </div>
          <div className="mt-auto p-4 border-t">
            <div className="flex gap-2">
              <ThemeToggle />
              <Button
                onClick={handleLogout}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                {isLoading ? 'Logging out...' : 'Logout'}
              </Button>
            </div>
          </div>
        </SheetContent>

        <aside
          className={`${isCollapsed ? 'w-20' : 'w-64'} hidden md:flex flex-col bg-card shadow-sm border-r transition-[width] duration-200`}
        >
          <div className="p-6">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-primary">{isCollapsed ? 'D' : 'DiscipleHub'}</h1>
                {!isCollapsed && <p className="text-xs text-gray-500 mt-1">Admin Dashboard</p>}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsCollapsed((v) => !v)}
                className="shrink-0"
              >
                {isCollapsed ? (
                  <PanelLeftOpenIcon className="h-4 w-4" />
                ) : (
                  <PanelLeftCloseIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="py-2">
            <Nav />
          </div>

          <div className="mt-auto p-4">
            <div className={isCollapsed ? 'space-y-2' : 'flex gap-2'}>
              <ThemeToggle />
              <Button
                onClick={handleLogout}
                disabled={isLoading}
                variant="outline"
                className={isCollapsed ? 'w-[120px] px-0' : 'w-[120px]'}
              >
                {isCollapsed ? 'Logout' : isLoading ? 'Logging out...' : 'Logout'}
              </Button>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-auto">
          <div className="md:hidden sticky top-0 z-40 border-b bg-card">
            <div className="h-14 px-4 flex items-center gap-3">
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <MenuIcon className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <div className="min-w-0">
                <div className="font-semibold truncate">Admin Dashboard</div>
                <div className="text-xs text-gray-500 truncate">DiscipleHub</div>
              </div>
              <ThemeToggle />
            </div>
          </div>

          <div className="p-4 md:p-8">{children}</div>
        </main>
      </Sheet>
    </div>
  );
}
