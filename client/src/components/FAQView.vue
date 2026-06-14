<script setup>
import { ref } from "vue";
import { ChevronDown, HelpCircle, BookOpen, UserCheck, ShieldAlert } from "@lucide/vue";

const props = defineProps({
  session: {
    type: Object,
    required: true
  }
});

import { makeTranslator } from "../translate";
const t = (text) => makeTranslator(props.session?.user?.email)(text);

const faqs = ref([
  {
    question: "How do I request to borrow equipment?",
    answer: "Go to the 'Borrow Equipment' tab in the side menu. Select the equipment you need, enter the quantity, and choose the purpose (Classroom, Lab, Research, or Event). Enter the location and due date, then submit. If you are a Student, your request will require Support Desk approval. Lecturers and Event Staff can borrow immediately.",
    category: "Borrowing",
    open: true
  },
  {
    question: "What is the new Location format?",
    answer: "Locations now follow the 'Campus-Building-Room' composite key format. For example: 'HN-ATC-625' (Hanoi campus, ATC building, Room 625), 'HN-LIB-DESK' (Hanoi campus, Library Desk), or 'HN-BA-701' (Hanoi campus, BA building, Room 701).",
    category: "General",
    open: false
  },
  {
    question: "What is the new Asset Code format?",
    answer: "Asset codes follow the 'brand-assetTag-id' composite key format. For example, a Logitech camera kit would have an asset code like 'Logitech-LRC-001'. This allows unique identification of specific brands and inventory tags.",
    category: "General",
    open: false
  },
  {
    question: "How do I return borrowed equipment?",
    answer: "To return equipment, go to the 'Confirm Return' section, find your active borrowing request, and submit a return. A Support Desk staff member will inspect the equipment, confirm the returned quantity, mark the condition (OK or Damaged), and complete the return process.",
    category: "Returning",
    open: false
  },
  {
    question: "What is the Chain of Custody feature?",
    answer: "For Event bookings, the system maintains a detailed chain of custody log. Each time the equipment is handed over, checked out, transferred, or inspected, the holder must record the action and condition notes in the custody log to ensure complete accountability.",
    category: "Borrowing",
    open: false
  }
]);

function toggleFaq(index) {
  faqs.value[index].open = !faqs.value[index].open;
}
</script>

<template>
  <div class="faq-container">
    <header class="faq-header">
      <div class="faq-title-wrap">
        <HelpCircle class="faq-icon" :size="28" />
        <div>
          <h1>{{ t('Frequently Asked Questions') }}</h1>
          <p>{{ t('Find answers to common questions about the Swinburne Equipment Portal.') }}</p>
        </div>
      </div>
    </header>

    <div class="faq-grid">
      <div class="faq-list">
        <div
          v-for="(faq, index) in faqs"
          :key="index"
          class="faq-item"
          :class="{ 'faq-item-open': faq.open }"
        >
          <button
            type="button"
            class="faq-question"
            @click="toggleFaq(index)"
            :aria-expanded="faq.open"
          >
            <span class="faq-category-badge" :class="faq.category.toLowerCase()">{{ t(faq.category) }}</span>
            <span class="faq-question-text">{{ t(faq.question) }}</span>
            <ChevronDown class="faq-caret" :size="18" />
          </button>
          <div class="faq-answer-wrapper" :style="{ maxHeight: faq.open ? '200px' : '0px' }">
            <div class="faq-answer">
              <p>{{ t(faq.answer) }}</p>
            </div>
          </div>
        </div>
      </div>

      <aside class="faq-sidebar">
        <div class="support-card">
          <BookOpen :size="24" class="support-icon" />
          <h3>{{ t('Need more help?') }}</h3>
          <p>{{ t('Read our portal documentation or guidelines for detailed information on student and lecturer policies.') }}</p>
          <a href="#" class="support-link">{{ t('View Guidelines') }}</a>
        </div>
        <div class="support-card support-desk">
          <UserCheck :size="24" class="support-icon" />
          <h3>{{ t('Support Desk') }}</h3>
          <p>{{ t('Contact Swinburne Vietnam Support Desk for emergency equipment requests or physical support.') }}</p>
          <strong>Email: support@fe.edu.vn</strong>
          <strong>Hotline: +84 24 7300 3289</strong>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.faq-container {
  max-width: 1200px;
  margin: 0 auto;
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.faq-header {
  background: #ffffff;
  border: 1px solid #eeeeef;
  border-radius: 4px;
  padding: 24px 28px;
  margin-bottom: 24px;
  box-shadow: 0 1px 2px rgba(32, 32, 42, 0.04);
}

.faq-title-wrap {
  display: flex;
  align-items: center;
  gap: 16px;
}

.faq-icon {
  color: #5f63ff;
}

.faq-header h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: #3e3e4a;
}

.faq-header p {
  margin: 4px 0 0;
  font-size: 13px;
  color: #727285;
}

.faq-grid {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 24px;
}

@media (max-width: 960px) {
  .faq-grid {
    grid-template-columns: 1fr;
  }
}

.faq-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.faq-item {
  background: #ffffff;
  border: 1px solid #eeeeef;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(32, 32, 42, 0.04);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.faq-item:hover {
  border-color: #d0d0df;
  box-shadow: 0 4px 12px rgba(32, 32, 42, 0.06);
}

.faq-item-open {
  border-color: #5f63ff;
  box-shadow: 0 4px 12px rgba(95, 99, 255, 0.08);
}

.faq-question {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  background: transparent;
  border: 0;
  color: #3e3e4a;
  cursor: pointer;
  text-align: left;
  min-height: auto;
  gap: 12px;
}

.faq-category-badge {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 3px;
  letter-spacing: 0.5px;
}

.faq-category-badge.borrowing {
  background: #e0f2fe;
  color: #0369a1;
}

.faq-category-badge.returning {
  background: #ecfdf5;
  color: #047857;
}

.faq-category-badge.general {
  background: #faf5ff;
  color: #6b21a8;
}

.faq-question-text {
  flex: 1;
  font-size: 14px;
  font-weight: 700;
  color: #3e3e4a;
}

.faq-caret {
  color: #a7a7b4;
  transition: transform 0.3s ease;
}

.faq-item-open .faq-caret {
  transform: rotate(180deg);
  color: #5f63ff;
}

.faq-answer-wrapper {
  transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.faq-answer {
  padding: 0 24px 20px 24px;
  border-top: 1px solid #f7f7f9;
  font-size: 13.5px;
  line-height: 1.6;
  color: #555562;
}

.faq-answer p {
  margin: 10px 0 0;
}

.faq-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.support-card {
  background: #ffffff;
  border: 1px solid #eeeeef;
  border-radius: 4px;
  padding: 22px;
  box-shadow: 0 1px 2px rgba(32, 32, 42, 0.04);
}

.support-card h3 {
  margin: 12px 0 8px;
  font-size: 14.5px;
  font-weight: 800;
  color: #3e3e4a;
}

.support-card p {
  margin: 0 0 16px;
  font-size: 12.5px;
  line-height: 1.5;
  color: #727285;
}

.support-icon {
  color: #5f63ff;
}

.support-link {
  display: inline-flex;
  align-items: center;
  font-size: 12.5px;
  font-weight: 700;
  color: #5f63ff;
  text-decoration: none;
}

.support-link:hover {
  text-decoration: underline;
}

.support-desk {
  background: linear-gradient(135deg, #ffffff, #faf9ff);
  border-left: 3px solid #5f63ff;
}

.support-desk strong {
  display: block;
  font-size: 12px;
  color: #3e3e4a;
  margin-top: 6px;
}
</style>
