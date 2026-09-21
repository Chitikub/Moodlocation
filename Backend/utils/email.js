const sendVerificationEmail = async (email, token) => {
    try {
        if (!process.env.BREVO_API_KEY) {
            console.error('BREVO_API_KEY is not defined in .env');
            return false;
        }

        let frontendUrl = process.env.FRONTEND_URL || (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',')[0].trim() : 'http://localhost:5173');
        if (frontendUrl.includes(',')) {
            frontendUrl = frontendUrl.split(',')[0].trim();
        }
        const senderEmail = process.env.BREVO_SENDER_EMAIL || "noreply@moodlocationfinder.com";

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': process.env.BREVO_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: { name: "Mood Location Finder", email: senderEmail },
                to: [{ email: email }],
                subject: "ยืนยันการสมัครสมาชิก Mood Location Finder",
                htmlContent: `
                    <div style="font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; text-align: center; padding: 40px 20px; background-color: #F7F4EF; color: #3D342E;">
                        <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 40px 30px; border-radius: 16px; box-shadow: 0 4px 20px rgba(61, 52, 46, 0.06); border: 1px solid #EFEBE4;">
                            <img src="https://moodlocationproject.vercel.app/logo1.png" alt="Mood Location Finder" style="width: 160px; height: auto; display: block; margin: 0 auto 28px auto;" />
                            <h2 style="color: #3D342E; font-size: 22px; font-weight: bold; margin-bottom: 16px; font-family: 'Helvetica Neue', Arial, sans-serif;">ยินดีต้อนรับสู่ Mood Location Finder!</h2>
                            <p style="color: #635852; font-size: 15px; line-height: 1.6; margin-bottom: 30px;">เราดีใจที่คุณร่วมเป็นส่วนหนึ่งกับเรา กรุณาคลิกที่ปุ่มด้านล่างเพื่อยืนยันที่อยู่อีเมลของคุณ</p>
                            <div style="margin: 30px 0;">
                                <a href="${frontendUrl}/verify-email?token=${token}" style="display: inline-block; padding: 14px 32px; background-color: #E07A5F; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 10px rgba(224, 122, 95, 0.25);">ยืนยันอีเมลของคุณ</a>
                            </div>
                            <div style="margin-top: 40px; border-top: 1px solid #F0ECE6; padding-top: 24px;">
                                <p style="font-size: 13px; color: #A09690; margin: 0;">หากคุณไม่ได้ทำการสมัครสมาชิก กรุณาละเว้นอีเมลฉบับนี้</p>
                            </div>
                        </div>
                    </div>
                `
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error from Brevo API:', errorData);
            return false;
        }

        const data = await response.json();
        console.log('Verification email sent successfully:', data.messageId);
        return true;
    } catch (error) {
        console.error('Error sending verification email:', error);
        return false;
    }
};

const sendPasswordResetEmail = async (email, token) => {
    try {
        if (!process.env.BREVO_API_KEY) {
            console.error('BREVO_API_KEY is not defined in .env');
            return false;
        }

        let frontendUrl = process.env.FRONTEND_URL || (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',')[0].trim() : 'http://localhost:5173');
        if (frontendUrl.includes(',')) {
            frontendUrl = frontendUrl.split(',')[0].trim();
        }
        const senderEmail = process.env.BREVO_SENDER_EMAIL || "noreply@moodlocationfinder.com";

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': process.env.BREVO_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: { name: "Mood Location Finder", email: senderEmail },
                to: [{ email: email }],
                subject: "รีเซ็ตรหัสผ่าน Mood Location Finder",
                htmlContent: `
                    <div style="font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; text-align: center; padding: 40px 20px; background-color: #F7F4EF; color: #3D342E;">
                        <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 40px 30px; border-radius: 16px; box-shadow: 0 4px 20px rgba(61, 52, 46, 0.06); border: 1px solid #EFEBE4;">
                            <img src="https://moodlocationproject.vercel.app/logo1.png" alt="Mood Location Finder" style="width: 160px; height: auto; display: block; margin: 0 auto 28px auto;" />
                            <h2 style="color: #3D342E; font-size: 22px; font-weight: bold; margin-bottom: 16px; font-family: 'Helvetica Neue', Arial, sans-serif;">รีเซ็ตรหัสผ่านของคุณ</h2>
                            <p style="color: #635852; font-size: 15px; line-height: 1.6; margin-bottom: 30px;">เราได้รับการร้องขอให้ตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ คลิกที่ปุ่มด้านล่างเพื่อรีเซ็ตรหัสผ่าน</p>
                            <div style="margin: 30px 0;">
                                <a href="${frontendUrl}/reset-password?token=${token}" style="display: inline-block; padding: 14px 32px; background-color: #E07A5F; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 10px rgba(224, 122, 95, 0.25);">ตั้งรหัสผ่านใหม่</a>
                            </div>
                            <div style="margin-top: 40px; border-top: 1px solid #F0ECE6; padding-top: 24px;">
                                <p style="font-size: 13px; color: #A09690; margin: 0;">ถ้าคุณไม่ได้ร้องขอการรีเซ็ตรหัสผ่าน โปรดไม่ต้องดำเนินการใด ๆ</p>
                            </div>
                        </div>
                    </div>
                `
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error from Brevo API:', errorData);
            return false;
        }

        const data = await response.json();
        console.log('Password reset email sent successfully:', data.messageId);
        return true;
    } catch (error) {
        console.error('Error sending password reset email:', error);
        return false;
    }
};

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail
};
