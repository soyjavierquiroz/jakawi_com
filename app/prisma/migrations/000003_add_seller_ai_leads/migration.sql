CREATE TYPE "LeadStatus" AS ENUM ('BROWSING', 'ENGAGED', 'WHATSAPP_CLICKED', 'CONTACTED', 'WON', 'LOST');
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');
CREATE TYPE "LeadEventType" AS ENUM ('STORE_VIEW', 'PRODUCT_VIEW', 'CATEGORY_VIEW', 'CHAT_OPENED', 'AI_MESSAGE_SENT', 'CUSTOMER_MESSAGE_SENT', 'PRODUCT_RECOMMENDED', 'WHATSAPP_CLICKED', 'LEAD_CREATED', 'LEAD_UPDATED', 'LEAD_STATUS_CHANGED');

CREATE TABLE "Lead" (
  "id" TEXT NOT NULL,
  "leadCode" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "customerName" TEXT,
  "customerPhone" TEXT,
  "source" TEXT,
  "status" "LeadStatus" NOT NULL DEFAULT 'BROWSING',
  "intentScore" INTEGER NOT NULL DEFAULT 10,
  "currentProductId" TEXT,
  "selectedProductId" TEXT,
  "selectedVariant" TEXT,
  "city" TEXT,
  "budget" TEXT,
  "urgency" TEXT,
  "objections" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "conversationSummary" TEXT,
  "whatsappMessage" TEXT,
  "whatsappClickedAt" TIMESTAMP(3),
  "viewedProducts" JSONB,
  "recommendedProducts" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Conversation" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "modelUsed" TEXT,
  "tokensInput" INTEGER NOT NULL DEFAULT 0,
  "tokensOutput" INTEGER NOT NULL DEFAULT 0,
  "costEstimate" DECIMAL(10,6),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConversationMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "role" "MessageRole" NOT NULL,
  "content" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConversationMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadEvent" (
  "id" TEXT NOT NULL,
  "leadId" TEXT,
  "sessionId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "eventType" "LeadEventType" NOT NULL,
  "productId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Lead_leadCode_key" ON "Lead"("leadCode");
CREATE INDEX "Lead_storeId_createdAt_idx" ON "Lead"("storeId", "createdAt");
CREATE INDEX "Lead_sessionId_idx" ON "Lead"("sessionId");
CREATE INDEX "Lead_status_idx" ON "Lead"("status");
CREATE INDEX "Lead_intentScore_idx" ON "Lead"("intentScore");
CREATE UNIQUE INDEX "Conversation_leadId_key" ON "Conversation"("leadId");
CREATE INDEX "Conversation_leadId_idx" ON "Conversation"("leadId");
CREATE INDEX "Conversation_storeId_createdAt_idx" ON "Conversation"("storeId", "createdAt");
CREATE INDEX "ConversationMessage_conversationId_createdAt_idx" ON "ConversationMessage"("conversationId", "createdAt");
CREATE INDEX "LeadEvent_storeId_createdAt_idx" ON "LeadEvent"("storeId", "createdAt");
CREATE INDEX "LeadEvent_sessionId_idx" ON "LeadEvent"("sessionId");
CREATE INDEX "LeadEvent_leadId_idx" ON "LeadEvent"("leadId");
CREATE INDEX "LeadEvent_eventType_idx" ON "LeadEvent"("eventType");

ALTER TABLE "Lead" ADD CONSTRAINT "Lead_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadEvent" ADD CONSTRAINT "LeadEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
