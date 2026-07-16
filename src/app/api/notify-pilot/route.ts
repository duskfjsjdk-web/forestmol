// 파일럿 신청 알림 이메일 API
// Supabase Database Webhook → 이 엔드포인트 → Resend 이메일 발송

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const record = payload.record;

    // 레코드가 없으면 에러 반환
    if (!record) {
      return Response.json({ ok: false, error: '레코드 없음' }, { status: 400 });
    }

    // Resend API로 이메일 발송
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ForestMol <onboarding@resend.dev>',
        to: ['duskfjsjdk@gmail.com'],
        subject: `[ForestMol] 새 파일럿 신청 — ${record.company_name}`,
        html: `<!DOCTYPE html>
          <html lang="ko">
          <head><meta charset="UTF-8"><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"></head>
          <body>
          <div style="font-family: 'Noto Sans KR', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #FAF7F0; border-radius: 12px;">
            <div style="background: #2D5016; color: white; padding: 20px 24px; border-radius: 8px; margin-bottom: 24px;">
              <h1 style="margin: 0; font-size: 20px;">🌿 ForestMol</h1>
              <p style="margin: 4px 0 0; opacity: 0.8; font-size: 14px;">새로운 파일럿 신청이 들어왔습니다</p>
            </div>
            
            <div style="background: white; padding: 24px; border-radius: 8px; border: 1px solid #E5E7EB;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; color: #6B7280; font-size: 14px; width: 100px;">회사명</td>
                  <td style="padding: 10px 0; font-weight: 600; color: #111827;">${record.company_name || '미입력'}</td>
                </tr>
                <tr style="border-top: 1px solid #F3F4F6;">
                  <td style="padding: 10px 0; color: #6B7280; font-size: 14px;">이름</td>
                  <td style="padding: 10px 0; font-weight: 600; color: #111827;">${record.name || '미입력'}</td>
                </tr>
                <tr style="border-top: 1px solid #F3F4F6;">
                  <td style="padding: 10px 0; color: #6B7280; font-size: 14px;">이메일</td>
                  <td style="padding: 10px 0; font-weight: 600; color: #111827;">
                    <a href="mailto:${record.email}" style="color: #2D5016;">${record.email || '미입력'}</a>
                  </td>
                </tr>
                <tr style="border-top: 1px solid #F3F4F6;">
                  <td style="padding: 10px 0; color: #6B7280; font-size: 14px;">신청일</td>
                  <td style="padding: 10px 0; font-weight: 600; color: #111827;">${new Date(record.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</td>
                </tr>
                ${record.message ? `
                <tr style="border-top: 1px solid #F3F4F6;">
                  <td style="padding: 10px 0; color: #6B7280; font-size: 14px; vertical-align: top;">메시지</td>
                  <td style="padding: 10px 0; color: #374151;">${record.message}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            <div style="margin-top: 24px; text-align: center;">
              <a href="https://supabase.com/dashboard/project/kvsytrnlgzyemmxieoxr/editor" 
                 style="background: #2D5016; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
                Supabase에서 확인하기 →
              </a>
            </div>
            
            <p style="margin-top: 24px; color: #9CA3AF; font-size: 12px; text-align: center;">
              이 이메일은 ForestMol 파일럿 신청 자동 알림입니다.
            </p>
          </div>
          </body>
          </html>
        `
      })
    });

    // Resend API 응답 확인
    if (!res.ok) {
      const errorBody = await res.text();
      console.error('Resend API 오류:', errorBody);
      return Response.json({ ok: false, error: errorBody }, { status: 500 });
    }

    const data = await res.json();
    console.log('이메일 발송 성공:', data.id);
    return Response.json({ ok: true, emailId: data.id });

  } catch (error) {
    console.error('notify-pilot 처리 중 오류:', error);
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
