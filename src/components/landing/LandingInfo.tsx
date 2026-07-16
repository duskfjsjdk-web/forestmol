"use client";

import React from 'react';
import { Search, Cpu, FileText, Clock, DollarSign, Database, ShieldCheck, Zap, CheckCircle2, XCircle } from 'lucide-react';

export default function LandingInfo() {
  return (
    <div className="bg-[#FAF7F0] text-stone-800">

      {/* 1. 작동 원리 (How It Works) */}
      <section id="process" className="py-28 px-6 border-t border-stone-200 relative overflow-hidden bg-gradient-to-b from-[#FAF7F0] to-[#EAE6DB]/40">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-24">
            <h2 className="text-xs font-bold text-[#2D5016] tracking-widest uppercase bg-[#2D5016]/10 px-3 py-1 rounded-full inline-block">
              PROCESS
            </h2>
            <h3 className="text-4xl md:text-5xl font-black tracking-tight text-stone-900 leading-tight">
              ForestMol은 어떻게 작동하나요?
            </h3>
            <p className="text-stone-500 max-w-xl mx-auto font-medium text-base">
              기존에 몇 달씩 소요되던 복잡한 소재 검토 단계를 <br className="hidden sm:block" />
              최신 RAG AI 알고리즘으로 단 3단계 만에 당일 완성합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 relative">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center p-8 bg-white/60 backdrop-blur-md border border-white rounded-3xl relative group hover:border-[#2D5016]/30 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl bg-[#2D5016]/10 text-[#2D5016] flex items-center justify-center mb-8 group-hover:bg-[#2D5016] group-hover:text-white transition-all duration-300">
                <Search className="w-8 h-8" />
              </div>
              <div className="absolute top-6 right-6 text-6xl font-black text-stone-300/20 select-none group-hover:text-[#2D5016]/10 transition-colors">01</div>
              <h4 className="text-xl font-black mb-3 text-stone-900">관심 카테고리/소재 설정</h4>
              <p className="text-stone-500 text-sm font-semibold leading-relaxed">
                피부 진정, 탄력, 미백 등 원하는 효능과 관심 수종(소나무, 오미자 등)을 솔루션에 자유롭게 입력합니다.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center p-8 bg-white/60 backdrop-blur-md border border-white rounded-3xl relative group hover:border-[#2D5016]/30 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl bg-[#2D5016]/10 text-[#2D5016] flex items-center justify-center mb-8 group-hover:bg-[#2D5016] group-hover:text-white transition-all duration-300">
                <Cpu className="w-8 h-8" />
              </div>
              <div className="absolute top-6 right-6 text-6xl font-black text-stone-300/20 select-none group-hover:text-[#2D5016]/10 transition-colors">02</div>
              <h4 className="text-xl font-black mb-3 text-stone-900">AI RAG 알고리즘 분석</h4>
              <p className="text-stone-500 text-sm font-semibold leading-relaxed">
                국내 공공데이터 5종(산림청·NIFoS·식약처·KIPRIS)과<br />KNApSAck·KEGG·PubChem 국제 오픈 DB를 연동하여<br />목표 활성 지표와 규제 성분을 교차 분석합니다.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center p-8 bg-white/60 backdrop-blur-md border border-white rounded-3xl relative group hover:border-[#2D5016]/30 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl bg-[#2D5016]/10 text-[#2D5016] flex items-center justify-center mb-8 group-hover:bg-[#2D5016] group-hover:text-white transition-all duration-300">
                <FileText className="w-8 h-8" />
              </div>
              <div className="absolute top-6 right-6 text-6xl font-black text-stone-300/20 select-none group-hover:text-[#2D5016]/10 transition-colors">03</div>
              <h4 className="text-xl font-black mb-3 text-stone-900">분석 제안 리포트 완성</h4>
              <p className="text-stone-500 text-sm font-semibold leading-relaxed">
                KIPRIS 실시간 특허 안전성, 식약처 원료 등급 및 AI 제형 가이드라인이 명시된 전문 제안 리포트를 획득합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 방식 비교 (Comparison Table) */}
      <section id="comparison" className="py-28 px-6 relative overflow-hidden bg-[#FAF7F0]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-24">
            <h2 className="text-xs font-bold text-[#2D5016] tracking-widest uppercase bg-[#2D5016]/10 px-3 py-1 rounded-full inline-block">
              COMPARISON
            </h2>
            <h3 className="text-4xl md:text-5xl font-black tracking-tight text-stone-900 leading-tight">
              소재 탐색 방식의 혁신적 대조
            </h3>
            <p className="text-stone-500 max-w-xl mx-auto font-medium text-base">
              오랜 시간과 막대한 기회비용이 소요되던 아날로그 방식과 <br />
              ForestMol AI만의 즉각적인 효율 차이를 비교해보세요.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-5xl mx-auto">
            {/* Traditional Method Card */}
            <div className="p-10 rounded-3xl border border-stone-200 bg-white/45 backdrop-blur-md relative overflow-hidden group hover:shadow-xl transition-all">
              <div className="flex items-center gap-3.5 mb-8">
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <XCircle className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-black text-stone-700">기존 아날로그 연구 방식</h4>
              </div>

              <ul className="space-y-6">
                <li className="flex items-start gap-4">
                  <Clock className="w-5 h-5 text-amber-600 mt-1 shrink-0" />
                  <div>
                    <strong className="text-stone-800 block text-base font-bold">평균 3 ~ 6개월 소요</strong>
                    <span className="text-stone-500 text-sm font-semibold">소재 학술 문헌 탐색부터 추출 원료사 수소문까지 물리적 시간 낭비</span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <DollarSign className="w-5 h-5 text-amber-600 mt-1 shrink-0" />
                  <div>
                    <strong className="text-stone-800 block text-base font-bold">수천만 원 기회비용 발생</strong>
                    <span className="text-stone-500 text-sm font-semibold">소재 효능 부재나 특허 침해 발견 시 기 투입된 인건비 및 시약비 매몰</span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <Database className="w-5 h-5 text-amber-600 mt-1 shrink-0" />
                  <div>
                    <strong className="text-stone-800 block text-base font-bold">제한적인 수종 분석</strong>
                    <span className="text-stone-500 text-sm font-semibold">연구원 개인의 선행 지식이나 기존 원료 카탈로그 범위 내에서만 탐색</span>
                  </div>
                </li>
              </ul>
            </div>

            {/* ForestMol AI Method Card */}
            <div className="p-10 rounded-3xl border-2 border-[#2D5016] bg-white relative overflow-hidden shadow-2xl shadow-emerald-900/10 group">
              <div className="absolute top-0 right-0 bg-[#2D5016] text-white text-[10px] font-black px-4 py-2 rounded-bl-2xl uppercase tracking-wider">
                RECOMMENDED
              </div>

              <div className="flex items-center gap-3.5 mb-8">
                <div className="w-11 h-11 rounded-xl bg-[#2D5016]/10 text-[#2D5016] flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-black text-[#2D5016]">ForestMol AI 탐색 솔루션</h4>
              </div>

              <ul className="space-y-6">
                <li className="flex items-start gap-4">
                  <Clock className="w-5 h-5 text-[#2D5016] mt-1 shrink-0" />
                  <div>
                    <strong className="text-stone-800 block text-base font-bold">실시간 분석 및 당일 리포트 수령</strong>
                    <span className="text-stone-500 text-sm font-semibold">초거대 AI 기반 연산으로 5초 만에 후보군 리스트업 및 분석 완료</span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <DollarSign className="w-5 h-5 text-[#2D5016] mt-1 shrink-0" />
                  <div>
                    <strong className="text-stone-800 block text-base font-bold">95% 이상의 선행 개발비 절감</strong>
                    <span className="text-stone-500 text-sm font-semibold">무의미한 성분 실험 전에 AI 검증 데이터로 규제 여부와 특허 선제 통과</span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <Database className="w-5 h-5 text-[#2D5016] mt-1 shrink-0" />
                  <div>
                    <strong className="text-stone-800 block text-base font-bold">5만종 성분 & 공공데이터 총망라</strong>
                    <span className="text-stone-500 text-sm font-semibold">국산 자생식물 7종 데이터셋과 성분 학술 인용 데이터를 빈틈없이 매핑</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 3. 핵심 강점 (Key Features) */}
      <section id="features" className="py-28 px-6 border-t border-stone-200 bg-gradient-to-b from-[#FAF7F0] to-[#E2DDD2]/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-24">
            <h2 className="text-xs font-bold text-[#2D5016] tracking-widest uppercase bg-[#2D5016]/10 px-3 py-1 rounded-full inline-block">
              FEATURES
            </h2>
            <h3 className="text-4xl md:text-5xl font-black tracking-tight text-stone-900 leading-tight">
              차별화된 ForestMol의 강점
            </h3>
            <p className="text-stone-500 max-w-xl mx-auto font-medium text-base">
              화장품 제조사 ODM 연구팀 및 인디 브랜드 기획팀의 <br />
              실무에 최적화된 첨단 R&D 편의 기능을 선사합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-3xl bg-white/70 backdrop-blur-md border border-white hover:shadow-2xl hover:border-[#2D5016]/20 hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-start text-left group">
              <div className="p-4 rounded-2xl bg-[#2D5016]/10 text-[#2D5016] mb-6 group-hover:bg-[#2D5016] group-hover:text-white transition-all">
                <Zap className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-black mb-3 text-stone-900">고성능 효능 예측 AI 엔진</h4>
              <p className="text-stone-500 text-sm font-semibold leading-relaxed">
                식물 화학 성분의 분자 구조와 임상 효능 데이터를 역추적하여, 기획 타깃 효능에 부합하는 국산 천연 원료를 선별해 냅니다.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-3xl bg-white/70 backdrop-blur-md border border-white hover:shadow-2xl hover:border-[#2D5016]/20 hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-start text-left group">
              <div className="p-4 rounded-2xl bg-[#2D5016]/10 text-[#2D5016] mb-6 group-hover:bg-[#2D5016] group-hover:text-white transition-all">
                <Database className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-black mb-3 text-stone-900">신뢰성 높은 원본 데이터 출처</h4>
              <p className="text-stone-500 text-sm font-semibold leading-relaxed">
                산림약용소재은행, 국가생물종정보시스템 등 국가 공인 데이터를 엄격히 준수하므로 마케팅 소구점 및 학술 근거 확보에 안전합니다.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-3xl bg-white/70 backdrop-blur-md border border-white hover:shadow-2xl hover:border-[#2D5016]/20 hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-start text-left group">
              <div className="p-4 rounded-2xl bg-[#2D5016]/10 text-[#2D5016] mb-6 group-hover:bg-[#2D5016] group-hover:text-white transition-all">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-black mb-3 text-stone-900">기밀 유지 및 독립 보안 인프라</h4>
              <p className="text-stone-500 text-sm font-semibold leading-relaxed">
                신제품 콘셉트와 검색 히스토리, 다운로드된 제안 리포트는 암호화 프로토콜을 통과하여 기업별 비밀 장부로 강력히 고립 보호됩니다.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
