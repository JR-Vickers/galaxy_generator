"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import Link from "next/link";
import GalaxyCanvas, { GalaxyCanvasHandle, Star } from "@/components/GalaxyCanvas";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

const defaultGravity = 1;
const defaultTimeStep = 0.1;
const defaultMass = 10;
const NAVBAR_HEIGHT = 100;

// Helper function to generate spiral galaxy stars
function generateSpiralGalaxyStars(
  centerX: number,
  centerY: number,
  numStars: number,
  numArms: number,
  armTightness: number, // Controls how tightly wound the arms are
  armSpread: number,    // Controls the thickness of the arms
  bulgeFraction: number, // Fraction of stars in the central bulge
  maxRadius: number,
  defaultMass: number,
  gravityConstant: number, // Added G
  starImagesLength: number // Needed for assigning random images
): Star[] {
  const stars: Star[] = [];
  const bulgeStarsCount = Math.floor(numStars * bulgeFraction);
  const armStarsCount = numStars - bulgeStarsCount;
  const armOffsetAngle = (Math.PI * 2) / numArms;
  const softening = 5; // Use a softening factor similar to the physics simulation

  // --- Calculate estimated masses ---
  // Estimate average mass slightly higher for bulge, slightly lower for arms based on current logic
  const avgBulgeMass = defaultMass * 1.5; // Estimate based on (1 + Math.random())
  const avgArmMass = defaultMass; // Estimate based on (0.8 + Math.random() * 0.4)
  const totalBulgeMass = bulgeStarsCount * avgBulgeMass;
  const totalArmMass = armStarsCount * avgArmMass;
  // const totalMass = totalBulgeMass + totalArmMass;

  // Create central bulge stars
  for (let i = 0; i < bulgeStarsCount; i++) {
    const radius = Math.random() * maxRadius * 0.2; // Bulge radius is 20% of max
    const angle = Math.random() * Math.PI * 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    // Small random initial velocity for bulge stars (keep this)
    const vx = (Math.random() - 0.5) * 0.1;
    const vy = (Math.random() - 0.5) * 0.1;
    const randomImageIndex = Math.floor(Math.random() * starImagesLength);
    stars.push({
      id: Date.now() + Math.random(), // Ensure unique ID
      x, y, vx, vy,
      mass: defaultMass * (1 + Math.random()), // Slightly vary mass in bulge
      imageIndex: randomImageIndex,
    });
  }

  // Create arm stars
  const starsPerArmBase = Math.floor(armStarsCount / numArms);
  let remainingArmStars = armStarsCount % numArms;

  for (let arm = 0; arm < numArms; arm++) {
    const baseArmAngle = arm * armOffsetAngle;
    const starsInThisArm = starsPerArmBase + (remainingArmStars > 0 ? 1 : 0);
    if (remainingArmStars > 0) {
        remainingArmStars--;
    }

    // Adjust angleIncrement based on stars *actually* in this arm for better distribution
    const currentArmAngleIncrement = (Math.PI * 2) / (numStars / numArms) * (armTightness / 15); // Keep similar angle step logic but scale base

    for (let i = 0; i < starsInThisArm; i++) {
      // Logarithmic spiral component
      // Use a scaled index based on average stars per arm for radius calculation to maintain overall shape
      const effectiveIndex = i * ( (armStarsCount/numArms) / starsInThisArm);
      const spiralAngle = effectiveIndex * currentArmAngleIncrement; // Use adjusted increment

      // Use the *intended* radius for velocity calculation before applying spread
      const idealRadius = armTightness * Math.exp(0.1 * spiralAngle);

      if (idealRadius > maxRadius) continue; // Don't exceed max radius

      // Add spread/thickness to the arm *after* calculating ideal position/velocity
      const spreadAngle = baseArmAngle + spiralAngle;
      const spreadRadius = idealRadius + (Math.random() - 0.5) * armSpread * idealRadius; // Spread proportional to radius

      const x = centerX + spreadRadius * Math.cos(spreadAngle);
      const y = centerY + spreadRadius * Math.sin(spreadAngle);

      // --- Calculate Orbital Velocity ---
      // Estimate enclosed mass: bulge mass + fraction of arm mass within idealRadius
      const enclosedArmMass = totalArmMass * (idealRadius / maxRadius); // Linear approximation
      const enclosedMass = totalBulgeMass + enclosedArmMass;

      // Prevent division by zero or tiny radius issues
      const radiusForCalc = Math.max(1, idealRadius);
      const orbitalSpeed = Math.sqrt((gravityConstant * enclosedMass) / (radiusForCalc + softening));

      // Tangential velocity components (counter-clockwise)
      const relX = idealRadius * Math.cos(spreadAngle); // Use ideal position for velocity direction
      const relY = idealRadius * Math.sin(spreadAngle);
      const norm = Math.sqrt(relX*relX + relY*relY) || 1;
      const vx = orbitalSpeed * (-relY / norm);
      const vy = orbitalSpeed * (relX / norm);
      // --- End Velocity Calculation ---

      const randomImageIndex = Math.floor(Math.random() * starImagesLength);
      stars.push({
        id: Date.now() + Math.random(), // Ensure unique ID
        x, y, vx, vy, // Assign calculated velocity
        mass: defaultMass * (0.8 + Math.random() * 0.4), // Vary mass slightly
        imageIndex: randomImageIndex,
      });
    }
  }

  return stars;
}

export default function Home() {
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [canvasHeight, setCanvasHeight] = useState(600);

  const [gravity, setGravity] = useState(defaultGravity);
  const [timeStep, setTimeStep] = useState(defaultTimeStep);
  const [mass, setMass] = useState(defaultMass);
  const [starCount, setStarCount] = useState(0);

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

  const handleCreateSpiralGalaxy = () => {
      if (!galaxyCanvasRef.current) return;

      // Define galaxy parameters (you can adjust these)
      const centerX = canvasWidth / 2;
      const centerY = canvasHeight / 2;
      const numStars = 800;
      const numArms = 5;
      const armTightness = 18;
      const armSpread = 0.25;
      const bulgeFraction = 0.12;
      const maxRadius = Math.min(canvasWidth, canvasHeight) * 0.8;
      const starImagesLength = 5; // Assuming 5 star images are loaded in GalaxyCanvas

      const newStars = generateSpiralGalaxyStars(
          centerX,
          centerY,
          numStars,
          numArms,
          armTightness,
          armSpread,
          bulgeFraction,
          maxRadius,
          mass, // Use current mass setting
          gravity, // Pass current gravity setting
          starImagesLength
      );

      galaxyCanvasRef.current.addStars(newStars);

      // Optional: Resume simulation if paused after generating
      if (isActuallyPaused) {
          handleTogglePause();
      }
  };

  const handlePauseStateChange = useCallback((paused: boolean) => {
      setIsActuallyPaused(paused);
  }, []);

  const handleStarCountChange = useCallback((count: number) => {
    setStarCount(count);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center relative">
      <NavigationMenu className="fixed top-0 left-0 w-full z-50 bg-background border-b" style={{ height: `${NAVBAR_HEIGHT}px` }}>
        <NavigationMenuList className="container mx-auto h-full px-8 font-mono flex items-center">
            <NavigationMenuItem className="flex items-center mr-8">
              <Image
                src="/images/space.jpeg"
                alt="Galaxy Icon"
                width={NAVBAR_HEIGHT}
                height={NAVBAR_HEIGHT}
                className="mr-4 rounded"
              />
              <span className="font-semibold text-lg">Galaxy Simulator v0.1</span>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Dialog open={isInstructionsOpen} onOpenChange={setIsInstructionsOpen}>
                <DialogTrigger asChild>
                   <button className={`${navigationMenuTriggerStyle()} text-lg`} onClick={() => setIsInstructionsOpen(true)}>Instructions</button>
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
                <NavigationMenuLink className={`${navigationMenuTriggerStyle()} text-lg`} target="_blank" rel="noopener noreferrer">About Me</NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>

      <div
        className="fixed left-4 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg p-4 z-40 flex space-x-4 shadow-lg"
        style={{ top: `${NAVBAR_HEIGHT + 16}px` }}
      >
          <div className="flex flex-col space-y-2">
              <Button onClick={handleResetParams} variant="outline" size="sm" className="w-full justify-start text-stroke-black">🔄 Reset Params</Button>
              <Button
                onClick={handleCreateSpiralGalaxy}
                size="sm"
                className="w-full justify-start bg-purple-600 text-orange-400 hover:bg-purple-700 text-stroke-black"
              >
                ✨ Create Galaxy
              </Button>
              <Button
                onClick={handleTogglePause}
                size="sm"
                className="w-full justify-start bg-white text-black hover:bg-gray-200"
              >
                  {isActuallyPaused ? '▶️ Resume Sim' : '⏸️ Pause'}
              </Button>
              <Button onClick={handleSaveImage} size="sm" className="w-full justify-start text-stroke-black">💾 Save Image</Button>
              <Button
                onClick={handleClearStars}
                size="sm"
                className="w-full justify-start bg-red-800 text-white hover:bg-red-900 text-stroke-black"
              >
                🗑️ Clear Stars
              </Button>
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
             <div className="text-sm pt-2 text-center border-t mt-2">
                 Star Count: {starCount}
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
          onStarCountChange={handleStarCountChange}
        />
      </div>
    </main>
  );
}
