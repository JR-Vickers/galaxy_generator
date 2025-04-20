"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import Link from "next/link";
import GalaxyCanvas, { GalaxyCanvasHandle, Star } from "@/components/GalaxyCanvas";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

const defaultGravity = 1;
const defaultTimeStep = 0.1;
const defaultMass = 10;
const NAVBAR_HEIGHT = 50;

export default function Home() {
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [canvasHeight, setCanvasHeight] = useState(600);

  const [gravity, setGravity] = useState(defaultGravity);
  const [timeStep, setTimeStep] = useState(defaultTimeStep);
  const [mass, setMass] = useState(defaultMass);

  const galaxyCanvasRef = useRef<GalaxyCanvasHandle>(null);
  const [isActuallyPaused, setIsActuallyPaused] = useState(false);

  useEffect(() => {
    function handleResize() {
      setCanvasWidth(window.innerWidth);
      setCanvasHeight(window.innerHeight - NAVBAR_HEIGHT - 10);
    }
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleGravityChange = useCallback((val: number[]) => setGravity(val[0]), []);
  const handleTimeStepChange = useCallback((val: number[]) => setTimeStep(val[0]), []);
  const handleMassChange = useCallback((val: number[]) => setMass(val[0]), []);

  const handleTogglePause = () => {
    galaxyCanvasRef.current?.togglePause();
  };
  const handleClearStars = () => galaxyCanvasRef.current?.clearStars();
  const handleSaveImage = () => galaxyCanvasRef.current?.saveImage();
  const handleResetParams = () => {
      setGravity(defaultGravity);
      setTimeStep(defaultTimeStep);
      setMass(defaultMass);
  };

  const handlePauseStateChange = useCallback((paused: boolean) => {
      setIsActuallyPaused(paused);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center relative">
      <NavigationMenu className="fixed top-0 left-0 w-full z-50 bg-background border-b" style={{ height: `${NAVBAR_HEIGHT}px` }}>
        <NavigationMenuList className="container mx-auto h-full px-4">
            <NavigationMenuItem>
              <span className="font-semibold mr-4">Galaxy Maker v0.1</span>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/" legacyBehavior passHref>
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>Home</NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Dialog open={isInstructionsOpen} onOpenChange={setIsInstructionsOpen}>
                <DialogTrigger asChild>
                   <button className={navigationMenuTriggerStyle()} onClick={() => setIsInstructionsOpen(true)}>Instructions</button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                   <DialogHeader><DialogTitle>Instructions</DialogTitle></DialogHeader>
                   <p>Click to add one star, drag to add many stars.</p>
                   <p>Use mass slider to adjust the mass of new stars.</p>
                   <p>Use gravity slider to increase the gravitational pull of all stars.</p>
                   <p>Use the time step slider to adjust the speed of the simulation.</p>
                </DialogContent>
              </Dialog>
            </NavigationMenuItem>
             <NavigationMenuItem>
              <Link href="https://jarrettvickers.com/" legacyBehavior passHref>
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>About Me</NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>

      <div
        className="fixed left-4 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg p-4 z-40 flex space-x-4 shadow-lg"
        style={{ top: `${NAVBAR_HEIGHT + 16}px` }}
      >
          <div className="flex flex-col space-y-2">
              <Button onClick={handleResetParams} variant="outline" size="sm" className="w-full justify-start">Reset Params</Button>
              <Button onClick={handleTogglePause} size="sm" className="w-full justify-start">
                  {isActuallyPaused ? 'Resume Sim' : 'Pause Sim'}
              </Button>
              <Button onClick={handleClearStars} variant="destructive" size="sm" className="w-full justify-start">Clear Stars</Button>
              <Button onClick={handleSaveImage} size="sm" className="w-full justify-start">Save Galaxy</Button>
          </div>

          <div className="flex flex-col space-y-3 w-48">
             <div className="space-y-1">
               <Label htmlFor="mass-slider" className="text-xs flex justify-between">
                   <span>Mass</span><span>({mass})</span>
               </Label>
               <Slider id="mass-slider" min={1} max={50} step={1} value={[mass]} onValueChange={handleMassChange} />
             </div>
             <div className="space-y-1">
               <Label htmlFor="gravity-slider" className="text-xs flex justify-between">
                   <span>Gravity</span><span>({gravity.toFixed(1)})</span>
               </Label>
               <Slider id="gravity-slider" min={0} max={5} step={0.1} value={[gravity]} onValueChange={handleGravityChange} />
             </div>
             <div className="space-y-1">
                <Label htmlFor="timestep-slider" className="text-xs flex justify-between">
                   <span>Time Step</span><span>({timeStep.toFixed(2)})</span>
               </Label>
               <Slider id="timestep-slider" min={0.01} max={1} step={0.01} value={[timeStep]} onValueChange={handleTimeStepChange} />
             </div>
          </div>
      </div>

      <div className="w-full" style={{ paddingTop: `${NAVBAR_HEIGHT}px` }}>
        <GalaxyCanvas
          ref={galaxyCanvasRef}
          width={canvasWidth}
          height={canvasHeight}
          gravity={gravity}
          timeStep={timeStep}
          defaultMass={mass}
          onPauseStateChange={handlePauseStateChange}
        />
      </div>
    </main>
  );
}