import { createFileRoute } from "@tanstack/react-router";
import { breadcrumbMeta, HOME_CRUMB } from "@/lib/seo/breadcrumbs";
import { ogMeta, ogImageUrl, ogAlt, COURSE_KIT_OG_JOB } from "@/lib/seo/og";
import { FOR_PROGRAMS_URL } from "@/lib/seo/for-programs";
import { COURSE_KIT_DESCRIPTION, COURSE_KIT_NAME, COURSE_KIT_TITLE, COURSE_KIT_URL, courseKitJsonLd } from "@/lib/seo/course-kit";
import { CourseKitView } from "@/components/seo/course-kit-page";

/*
 * A static segment, so the router ranks it above /for-programs_/$audience:
 * /for-programs/course-kit renders the kit and every other slug still goes to the audience route.
 */
export const Route = createFileRoute("/for-programs_/course-kit")({
  head: () => ({
    meta: [
      breadcrumbMeta([HOME_CRUMB, { name: "For programs", url: FOR_PROGRAMS_URL }, { name: COURSE_KIT_NAME, url: COURSE_KIT_URL }]),
      { title: COURSE_KIT_TITLE },
      { name: "description", content: COURSE_KIT_DESCRIPTION },
      ...ogMeta({ title: COURSE_KIT_TITLE, description: COURSE_KIT_DESCRIPTION, url: COURSE_KIT_URL, image: ogImageUrl("page", "for-programs-course-kit"), alt: ogAlt(COURSE_KIT_OG_JOB) }),
      { "script:ld+json": courseKitJsonLd() } as unknown as { name: string; content: string },
    ],
    links: [{ rel: "canonical", href: COURSE_KIT_URL }],
  }),
  component: CourseKitView,
});
