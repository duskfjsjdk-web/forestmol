"use server";

import { supabase } from "@/lib/supabase";
import { z } from "zod";

// 서버 보안용 2차 데이터 검증 스키마
const pilotFormSchema = z.object({
  name: z.string()
    .min(2, { message: "이름은 2글자 이상 입력해주세요." })
    .refine(val => /^[a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ\s]+$/.test(val), { message: "이름은 한글, 영문, 숫자 조합이어야 합니다." }),
  company: z.string().min(2, { message: "소속은 2글자 이상 입력해주세요." }),
  email: z.string()
    .refine(val => val.includes('@') && val.includes('.') && val.indexOf('@') < val.lastIndexOf('.'), { message: "유효한 이메일 주소를 입력해주세요." }),
  categories: z.preprocess(
    (val) => {
      if (!val) return [];
      if (typeof val === 'string') return [val];
      return val;
    },
    z.array(z.string()).min(1, { message: "하나 이상의 관심 카테고리를 선택해주세요." })
  ),
});

export async function submitPilot(formData: {
  name: string;
  company: string;
  email: string;
  categories: string[];
}) {
  console.log("📥 [submitPilot Action 호출됨] 수신 데이터:", JSON.stringify(formData, null, 2));

  try {
    // 2차 유효성 검사 수행 (보안 검색대)
    const validationResult = pilotFormSchema.safeParse(formData);
    
    if (!validationResult.success) {
      const errorFormatted = validationResult.error.format();
      console.warn("⚠️ [submitPilot] Zod 유효성 검사 실패:", JSON.stringify(errorFormatted, null, 2));
      const firstError = validationResult.error.issues[0]?.message || "잘못된 데이터 형식입니다.";
      return {
        success: false,
        message: firstError
      };
    }

    console.log("✅ [submitPilot] Zod 유효성 검사 통과. Supabase insert 시도...");

    // Zod 검증을 마친 categories가 혹시나 배열이 아닐 경우를 대비해 2차로 강제 포장합니다.
    const categoriesData = validationResult.data.categories;
    const finalCategories = Array.isArray(categoriesData)
      ? categoriesData
      : (categoriesData ? [categoriesData] : []);

    const { data, error } = await supabase
      .from("pilot_signups")
      .insert([
        {
          name: validationResult.data.name,
          company: validationResult.data.company,
          email: validationResult.data.email,
          categories: finalCategories,
        }
      ]);

    if (error) {
      console.error("❌ [submitPilot] Supabase insert 에러 발생:", JSON.stringify(error, null, 2));
      // 중복 이메일 체크 (고유 제약조건 위반 에러 코드: 23505)
      if (error.code === '23505') {
        return { 
          success: false, 
          message: "이미 파일럿을 신청하셨습니다. 곧 연락드릴게요!" 
        };
      }
      return { 
        success: false, 
        message: `저장 실패: ${error.message || '잠시 후 다시 시도해주세요.'}` 
      };
    }

    console.log("🎉 [submitPilot] 데이터베이스 저장 완료! 결과:", JSON.stringify(data, null, 2));

    // 이메일 알림 발송 (실패해도 신청 자체는 성공 처리)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://forestmol.vercel.app'}/api/notify-pilot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record: {
            company_name: validationResult.data.company,
            name: validationResult.data.name,
            email: validationResult.data.email,
            created_at: new Date().toISOString(),
            message: `관심 카테고리: ${finalCategories.join(', ')}`,
          }
        }),
      });
      console.log("📧 [submitPilot] 알림 이메일 발송 요청 완료");
    } catch (emailError) {
      console.error("⚠️ [submitPilot] 알림 이메일 발송 실패 (신청은 정상 저장됨):", emailError);
    }

    return { 
      success: true, 
      message: "신청 완료! 24시간 내에 이메일로 보내드립니다 🌿" 
    };

  } catch (error: any) {
    console.error("❌ [submitPilot] 서버 액션 catch 블록 오류:", error.message || error);
    return { 
      success: false, 
      message: `서버 내부 오류: ${error.message || '잠시 후 다시 시도해주세요.'}` 
    };
  }
}

