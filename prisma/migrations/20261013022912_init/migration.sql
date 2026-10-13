-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'DROPDOWN', 'CHECKBOX', 'PHOTO');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('SUBMITTED', 'REVIEWED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('ADMIN', 'REPORTER', 'SYSTEM');

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pallet" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Pallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportForm" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormField" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "FieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "maxFiles" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "reporterName" TEXT NOT NULL,
    "reportDate" DATE NOT NULL,
    "shiftId" TEXT NOT NULL,
    "locationId" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'SUBMITTED',
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportAnswer" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "valueText" TEXT,
    "valueNumber" DOUBLE PRECISION,
    "valueDate" DATE,
    "valueJson" JSONB,

    CONSTRAINT "ReportAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportFile" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorType" "ActorType" NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Shift_name_key" ON "Shift"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Pallet_code_key" ON "Pallet"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ReportForm_slug_key" ON "ReportForm"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "FormField_formId_key_key" ON "FormField"("formId", "key");

-- CreateIndex
CREATE INDEX "Report_formId_reportDate_idx" ON "Report"("formId", "reportDate");

-- CreateIndex
CREATE INDEX "Report_shiftId_reportDate_idx" ON "Report"("shiftId", "reportDate");

-- CreateIndex
CREATE INDEX "Report_locationId_idx" ON "Report"("locationId");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "ReportAnswer_fieldId_idx" ON "ReportAnswer"("fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportAnswer_reportId_fieldId_key" ON "ReportAnswer"("reportId", "fieldId");

-- CreateIndex
CREATE INDEX "ReportFile_reportId_idx" ON "ReportFile"("reportId");

-- CreateIndex
CREATE INDEX "ReportFile_fieldId_idx" ON "ReportFile"("fieldId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorType_actorId_idx" ON "AuditLog"("actorType", "actorId");

-- AddForeignKey
ALTER TABLE "FormField" ADD CONSTRAINT "FormField_formId_fkey" FOREIGN KEY ("formId") REFERENCES "ReportForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_formId_fkey" FOREIGN KEY ("formId") REFERENCES "ReportForm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportAnswer" ADD CONSTRAINT "ReportAnswer_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportAnswer" ADD CONSTRAINT "ReportAnswer_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "FormField"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportFile" ADD CONSTRAINT "ReportFile_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportFile" ADD CONSTRAINT "ReportFile_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "FormField"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
