import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'motion/react';
import Link from 'next/link';

interface SetupRequiredStateProps {
  title?: string;
  description?: string;
  buttonText?: string;
  href?: string;
}

export default function SetupRequiredState({
  title = 'Setup Required',
  description = 'You need to be part of a household to view chores.',
  buttonText = 'Join or Create Household',
  href = '/household/join',
}: SetupRequiredStateProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{description}</p>
            <Button asChild className="w-full">
              <Link href={href}>{buttonText}</Link>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
