import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { services } from "@/db/schema";
import { updateService } from "@/app/actions";
import { requireUser } from "@/lib/session";
import { ServiceForm } from "@/components/service-form";
import { PageTitle } from "@/components/ui";

export const metadata = { title: "Edit service" };

export default async function EditService({ params }: PageProps<"/dashboard/services/[id]/edit">) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const user = await requireUser();
  const service = await db.query.services.findFirst({
    where: and(eq(services.id, id), eq(services.sellerId, user.id)),
  });
  if (!service || service.status === "removed") notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <PageTitle sub="Price changes apply to new orders only.">Edit service</PageTitle>
      <ServiceForm action={updateService.bind(null, service.id)} service={service} submitLabel="Save changes" />
    </div>
  );
}
