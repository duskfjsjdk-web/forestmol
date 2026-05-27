"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitPilot } from '@/app/actions/submitPilot';

const formSchema = z.object({
  name: z.string()
    .min(2, { message: "이름은 2글자 이상 입력해주세요." })
    .refine(val => /^[a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ\s]+$/.test(val), { message: "이름은 한글, 영문, 숫자 조합이어야 합니다." }),
  company: z.string().min(2, { message: "소속은 2글자 이상 입력해주세요." }),
  email: z.string()
    .refine(val => val.includes('@') && val.includes('.') && val.indexOf('@') < val.lastIndexOf('.'), { message: "유효한 이메일 주소를 입력해주세요." }),
  categories: z.array(z.string()).min(1, { message: "하나 이상의 관심 카테고리를 선택해주세요." }),
});

type FormValues = z.infer<typeof formSchema>;

const CATEGORY_OPTIONS = [
  { id: "anti-aging",   label: "항노화/탄력",   desc: "소나무, 편백 등 세포 탄력 증진 소재" },
  { id: "soothing",     label: "피부 진정/장벽", desc: "자작나무, 병풀 등 염증 완화 및 장벽 보호 소재" },
  { id: "brightening",  label: "미백/톤업",      desc: "동백, 유자 등 색소 침착 개선 소재" },
  { id: "antibacterial",label: "항균/방부",      desc: "편백, 향나무 등 피부 유해균 억제 소재" },
  { id: "moisturizing", label: "보습/수분",      desc: "솔잎, 오미자 등 피부 수분 공급 및 유지 소재" },
  { id: "scalp-hair",   label: "두피/모발",      desc: "측백나무, 참나무 등 탈모 개선 및 두피 케어 소재" },
  { id: "antioxidant",  label: "항산화",         desc: "구상나무, 가문비나무 등 활성산소 제거 소재" },
  { id: "fermentation", label: "발효 유래 소재",  desc: "유산균·효모 발효 처리 산림 추출물" },
  { id: "enzyme",       label: "효소 변환 소재",  desc: "글리코시다제·프로테아제 등 효소 처리 소재" },
  { id: "other",        label: "기타 특수 효능", desc: "주름 개선, 아토피 완화 등 맞춤형 효능 소재" },
];

export function PilotForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  // "기타 특수 효능" 입력창 텍스트를 별도로 관리합니다
  const [otherText, setOtherText] = useState('');
  const [otherTextError, setOtherTextError] = useState('');
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categories: []
    }
  });

  const selectedCategories = watch("categories") || [];
  // "other" 카테고리가 선택되었는지 확인합니다
  const isOtherSelected = selectedCategories.includes("other");

  const onSubmit = async (data: FormValues) => {
    // "기타 특수 효능" 선택했는데 텍스트 비어있으면 제출 막기
    if (isOtherSelected && !otherText.trim()) {
      setOtherTextError("구체적인 효능을 입력해주세요.");
      return;
    }
    setOtherTextError('');
    setIsSubmitting(true);
    setResult(null);

    try {
      // categories 배열에서 "other" 항목을 실제 입력 텍스트로 교체합니다
      const finalCategories = data.categories.map(cat =>
        cat === "other" ? otherText.trim() : cat
      );

      const res = await submitPilot({ ...data, categories: finalCategories });
      setResult(res);
    } catch (error) {
      console.error('Error submitting form:', error);
      setResult({ success: false, message: "잠시 후 다시 시도해주세요." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (result?.success) {
    return (
      <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-2">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-foreground">신청 완료!</h3>
        <p className="text-muted-foreground font-medium">{result.message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name" className="text-xs font-bold text-foreground/80">이름</Label>
        <Input 
          id="name" 
          placeholder="홍길동" 
          className={`h-10 bg-background/50 border-input/60 focus-visible:ring-primary ${errors.name ? 'border-destructive focus-visible:ring-destructive' : ''}`}
          {...register('name')}
        />
        {errors.name && <p className="text-xs text-destructive font-medium">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="company" className="text-xs font-bold text-foreground/80">소속 (회사명/연구소)</Label>
        <Input 
          id="company" 
          placeholder="OO코스메틱 연구소" 
          className={`h-10 bg-background/50 border-input/60 focus-visible:ring-primary ${errors.company ? 'border-destructive' : ''}`}
          {...register('company')}
        />
        {errors.company && <p className="text-xs text-destructive font-medium">{errors.company.message}</p>}
      </div>
      
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-xs font-bold text-foreground/80">업무용 이메일</Label>
        <Input 
          id="email" 
          type="email" 
          placeholder="name@company.com" 
          className={`h-10 bg-background/50 border-input/60 focus-visible:ring-primary ${errors.email ? 'border-destructive' : ''}`}
          {...register('email')}
        />
        {errors.email && <p className="text-xs text-destructive font-medium">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold text-foreground/80">관심 소재 카테고리 (다중 선택 가능)</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
          {CATEGORY_OPTIONS.map((opt) => {
            const isSelected = selectedCategories.includes(opt.id);
            const isOtherOpt = opt.id === "other";
            return (
              <div key={opt.id} className="h-full flex flex-col">
                <label 
                  className={`flex items-start p-2.5 rounded-xl border-2 cursor-pointer transition-all duration-200 select-none flex-grow ${
                    isSelected 
                      ? 'border-primary bg-primary/[0.03] shadow-sm shadow-primary/5' 
                      : 'border-border/60 hover:border-primary/30 hover:bg-muted/30 bg-background/30'
                  }`}
                >
                  <input
                    type="checkbox"
                    value={opt.id}
                    className="sr-only"
                    {...register('categories')}
                    // "기타 특수 효능" 해제 시 입력 텍스트와 에러 초기화
                    onChange={(e) => {
                      if (isOtherOpt && !e.target.checked) {
                        setOtherText('');
                        setOtherTextError('');
                      }
                      // react-hook-form 기본 onChange도 실행
                      register('categories').onChange(e);
                    }}
                  />
                  
                  {/* 커스텀 체크박스 아이콘 */}
                  <div className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center mt-0.5 mr-2.5 transition-all duration-200 ${
                    isSelected 
                      ? 'border-primary bg-primary text-primary-foreground scale-105' 
                      : 'border-muted-foreground/30 bg-background'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 stroke-[3] animate-in zoom-in-50 duration-200" />}
                  </div>

                  {/* 텍스트 라벨 */}
                  <div className="flex flex-col text-left">
                    <span className={`text-xs font-bold transition-colors ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                      {opt.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 font-medium leading-relaxed">
                      {opt.desc}
                    </span>
                  </div>
                </label>

                {/* "기타 특수 효능" 선택 시 슬라이드 다운으로 나타나는 입력창 */}
                {isOtherOpt && (
                  <div
                    style={{
                      maxHeight: isOtherSelected ? '120px' : '0px',
                      overflow: 'hidden',
                      transition: 'max-height 0.3s ease-in-out',
                    }}
                  >
                    <div className="pt-2 px-1">
                      <Input
                        id="other-text-input"
                        placeholder="예) 두피 케어, 아토피 완화, 항당뇨 등"
                        maxLength={100}
                        value={otherText}
                        onChange={(e) => {
                          setOtherText(e.target.value);
                          // 타이핑 시작하면 에러 메시지 제거
                          if (e.target.value.trim()) setOtherTextError('');
                        }}
                        className={`h-10 bg-background/50 border-input/60 focus-visible:ring-primary text-xs ${
                          otherTextError ? 'border-destructive focus-visible:ring-destructive' : ''
                        }`}
                      />
                      <div className="flex justify-between items-center mt-1">
                        {otherTextError
                          ? <p className="text-[10px] text-destructive font-medium">{otherTextError}</p>
                          : <span />
                        }
                        <p className="text-[10px] text-muted-foreground text-right ml-auto">
                          {otherText.length}/100
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {errors.categories && <p className="text-xs text-destructive font-medium">{errors.categories.message}</p>}
      </div>

      {result && !result.success && (
        <div className="p-3 text-xs text-destructive bg-destructive/10 rounded-md font-medium text-center border border-destructive/20">
          {result.message}
        </div>
      )}

      <Button 
        type="submit" 
        size="lg" 
        disabled={isSubmitting}
        className="w-full h-12 text-sm font-bold shadow-lg shadow-primary/20 mt-2 relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-primary/35 active:translate-y-0"
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-primary-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            신청 중...
          </span>
        ) : "무료 파일럿 신청하기"}
      </Button>
    </form>
  );
}
