import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-accent/20">
      {/* Navigation */}
      <nav className="p-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-primary">DiscipleHub</h1>
        <div className="flex gap-4">
          <Link href="/auth/login">
            <Button variant="outline">Login</Button>
          </Link>
          <Link href="/auth/register">
            <Button>Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex items-center justify-center min-h-[calc(100vh-100px)] px-4">
        <div className="max-w-2xl text-center">
          <h2 className="text-5xl font-bold text-foreground mb-6">
            Discipleship Made Simple
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Track your spiritual growth, complete daily tasks, take quizzes, and connect with 
            other disciples on your journey of faith.
          </p>

          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6 mt-12">
              <div className="bg-card/90 border border-border rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold text-lg mb-2 text-foreground">Daily Tasks</h3>
                <p className="text-muted-foreground text-sm">
                  Complete structured discipleship tasks designed for spiritual growth
                </p>
              </div>

              <div className="bg-card/90 border border-border rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold text-lg mb-2 text-foreground">Quizzes & Exams</h3>
                <p className="text-muted-foreground text-sm">
                  Test your knowledge and measure your understanding of biblical truths
                </p>
              </div>

              <div className="bg-card/90 border border-border rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold text-lg mb-2 text-foreground">Leaderboard</h3>
                <p className="text-muted-foreground text-sm">
                  Track your progress and see how you compare with other disciples
                </p>
              </div>
            </div>

            <div className="flex gap-4 justify-center mt-12">
              <Link href="/auth/register">
                <Button size="lg">Start Your Journey</Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="outline" size="lg">
                  Sign In
                </Button>
              </Link>
            </div>

            <div className="mt-10">
              <p className="text-sm text-muted-foreground mb-3">Joining an organization?</p>
              <form
                action="/auth/register"
                method="GET"
                className="flex flex-col sm:flex-row gap-3 justify-center"
              >
                <Input
                  name="invite"
                  placeholder="Enter organization code"
                  className="sm:w-80"
                  required
                />
                <Button type="submit" variant="outline">
                  Join Organization
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
