'use client';

import * as React from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface OnboardingStep {
  title: string;
  description: string;
  content: React.ReactNode;
}

interface OnboardingCarouselProps {
  steps: OnboardingStep[];
  onComplete: () => void;
}

export function OnboardingCarousel({
  steps,
  onComplete,
}: OnboardingCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(true);

  const scrollPrev = React.useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = React.useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = React.useCallback(() => {
    if (!emblaApi) return;
    setCurrentIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  React.useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  const isLastStep = currentIndex === steps.length - 1;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {steps.map((step, index) => (
            <div key={index} className="flex-[0_0_100%] min-w-0 px-4">
              <Card className="border-2">
                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-muted-foreground">
                      Step {index + 1} of {steps.length}
                    </span>
                    <div className="flex gap-1">
                      {steps.map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            'h-2 w-2 rounded-full transition-colors',
                            i === currentIndex
                              ? 'bg-primary'
                              : 'bg-muted'
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  <CardTitle>{step.title}</CardTitle>
                  <CardDescription>{step.description}</CardDescription>
                </CardHeader>
                <CardContent>{step.content}</CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={scrollPrev}
                    disabled={!canScrollPrev}
                  >
                    Previous
                  </Button>
                  {isLastStep ? (
                    <Button onClick={onComplete}>Get Started</Button>
                  ) : (
                    <Button onClick={scrollNext} disabled={!canScrollNext}>
                      Next
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
