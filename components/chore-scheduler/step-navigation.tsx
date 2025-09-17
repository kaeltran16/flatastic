import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { CheckCircle2, Clock, Eye, Users } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ChoreSelector, ChoreSelectorProps } from './chore-selector';
import { itemVariants } from './constants';
import { RotationPreview, RotationPreviewProps } from './rotation-preview';
import RotationSettings, { RotationSettingsProps } from './rotation-settings';
import { ActiveStep } from './types';
import { UserAvailability, UserAvailabilityProps } from './user-availability';

interface MobileStepNavigationProps {
  activeStep: ActiveStep;
  setActiveStep: (step: ActiveStep) => void;
  canProceed: () => boolean;
  nextStep: () => void;
  prevStep: () => void;
  showPreview: boolean;
  setShowPreview: (show: boolean) => void;
  choreSelectionProps: ChoreSelectorProps; 
  userAvailabilityProps: UserAvailabilityProps; 
  rotationSettingsProps: RotationSettingsProps; 
  rotationPreviewProps: RotationPreviewProps; 
}

export function MobileStepNavigation({
  activeStep,
  canProceed,
  nextStep,
  prevStep,
  showPreview,
  setShowPreview,
  choreSelectionProps,
  userAvailabilityProps,
  rotationSettingsProps,
  rotationPreviewProps,
}: MobileStepNavigationProps) {
  return (
    <>
      {/* Mobile Step Indicator */}
      <motion.div
        className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
        variants={itemVariants}
      >
        <div className="flex items-center gap-2">
          {['select', 'availability', 'settings', 'preview'].map(
            (step, index) => (
              <div
                key={step}
                className={`w-2 h-2 rounded-full ${
                  activeStep === step ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              />
            )
          )}
        </div>
        <div className="text-sm font-medium capitalize">
          {activeStep === 'select' && 'Select Chores'}
          {activeStep === 'availability' && 'Member Availability & Order'}
          {activeStep === 'settings' && 'Settings'}
          {activeStep === 'preview' && 'Preview'}
        </div>
      </motion.div>

      {/* Mobile Step Content */}
      <div>
        <AnimatePresence mode="wait">
          {activeStep === 'select' && (
            <motion.div
              key="select"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Select Chores
                  </CardTitle>
                  <CardDescription>
                    Choose which chores to include
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-4">
                  <ChoreSelector {...choreSelectionProps} />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeStep === 'availability' && (
            <motion.div
              key="availability"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Member Availability & Order
                  </CardTitle>
                  <CardDescription>
                    Select and arrange member order
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-4">
                  <UserAvailability {...userAvailabilityProps} />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeStep === 'settings' && (
            <motion.div
              key="settings"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Rotation Settings
                  </CardTitle>
                  <CardDescription>Configure rotation timing</CardDescription>
                </CardHeader>
                <CardContent className="pb-4">
                  <RotationSettings {...rotationSettingsProps} />
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Navigation */}
      <motion.div
        className="flex items-center justify-between gap-3 mt-6"
        variants={itemVariants}
      >
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={activeStep === 'select'}
          className="flex-1"
        >
          Back
        </Button>

        {activeStep !== 'preview' ? (
          <Button
            onClick={nextStep}
            disabled={!canProceed()}
            className="flex-1"
          >
            {activeStep === 'settings' ? 'Generate Preview' : 'Next'}
          </Button>
        ) : (
          <Sheet open={showPreview} onOpenChange={setShowPreview}>
            <SheetTrigger asChild>
              <Button className="flex-1">
                <Eye className="w-4 h-4 mr-2" />
                View Preview
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh]">
              <SheetHeader>
                <SheetTitle>Rotation Preview</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <RotationPreview {...rotationPreviewProps} />
              </div>
            </SheetContent>
          </Sheet>
        )}
      </motion.div>
    </>
  );
}
