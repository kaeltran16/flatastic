'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });
      if (error) throw error;
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      setIsLoading(false);
    }
  };

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 50,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.6, -0.05, 0.01, 0.99] as const,
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 },
    },
  };

  const buttonVariants = {
    idle: { scale: 1 },
    hover: {
      scale: 1.02,
      transition: { duration: 0.2 },
    },
    tap: {
      scale: 0.98,
      transition: { duration: 0.1 },
    },
    loading: {
      scale: [1, 1.02, 1],
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: 'easeInOut' as const,
      },
    },
  };

  const loadingSpinnerVariants = {
    animate: {
      rotate: 360,
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: 'linear' as const,
      },
    },
  };

  const errorVariants = {
    hidden: {
      opacity: 0,
      y: -10,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: 'easeOut' as const,
      },
    },
    exit: {
      opacity: 0,
      y: -10,
      scale: 0.95,
      transition: {
        duration: 0.2,
      },
    },
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-6 w-full max-w-md mx-auto px-4 sm:px-0',
        className
      )}
      {...props}
    >
      <motion.div initial="hidden" animate="visible" variants={cardVariants}>
        <Card className="border-0 shadow-2xl sm:border sm:shadow-lg">
          <CardHeader className="text-center space-y-4 px-6 sm:px-8 pt-8 sm:pt-6">
            <motion.div variants={itemVariants}>
              <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Welcome Back
              </CardTitle>
            </motion.div>
            <motion.div variants={itemVariants}>
              <CardDescription className="text-sm sm:text-base text-gray-600">
                Sign in to your account using Google
              </CardDescription>
            </motion.div>
          </CardHeader>
          <CardContent className="px-6 sm:px-8 pb-8 sm:pb-6">
            <motion.div className="flex flex-col gap-6" variants={itemVariants}>
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    key="error"
                    variants={errorVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <p className="text-sm text-red-600 text-center">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div variants={itemVariants}>
                <motion.div
                  variants={buttonVariants}
                  initial="idle"
                  whileHover={!isLoading ? 'hover' : 'loading'}
                  whileTap={!isLoading ? 'tap' : 'loading'}
                  animate={isLoading ? 'loading' : 'idle'}
                >
                  <Button
                    onClick={handleGoogleLogin}
                    className="w-full h-12 sm:h-11 text-base sm:text-sm font-medium bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 shadow-sm transition-all duration-200"
                    disabled={isLoading}
                    variant="outline"
                  >
                    {isLoading ? (
                      <motion.div
                        className="flex items-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                      >
                        <motion.div
                          variants={loadingSpinnerVariants}
                          animate="animate"
                          className="mr-2 h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full"
                        />
                        Signing in...
                      </motion.div>
                    ) : (
                      <motion.div
                        className="flex items-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                      >
                        <svg
                          className="mr-3 h-5 w-5 sm:h-4 sm:w-4"
                          viewBox="0 0 24 24"
                        >
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        Continue with Google
                      </motion.div>
                    )}
                  </Button>
                </motion.div>
              </motion.div>

              <motion.div variants={itemVariants} className="text-center">
                <p className="text-xs sm:text-sm text-gray-500">
                  By continuing, you agree to our Terms of Service and Privacy
                  Policy
                </p>
              </motion.div>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
