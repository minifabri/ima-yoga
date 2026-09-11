"use client";

import { useRouter } from "next/navigation";
import { CalendarContent } from "./CalendarContent";
import { MobileAreaHome } from "./MobileAreaHome";
import { useArea } from "./AreaShell";

export default function AreaHomePage() {
  const router = useRouter();
  const { classes, typeById, levelById, events, setSelected } = useArea();
  const nextEvent = events[0] ?? null;

  return (
    <>
      <div className="md:hidden">
        <MobileAreaHome
          classes={classes}
          typeById={typeById}
          levelById={levelById}
          nextEvent={nextEvent}
          onOpenClass={setSelected}
          onGoToCalendar={() => router.push("/area/calendario")}
          onGoToMine={() => router.push("/area/prenotazioni")}
        />
      </div>
      <div className="hidden md:block">
        <CalendarContent />
      </div>
    </>
  );
}
