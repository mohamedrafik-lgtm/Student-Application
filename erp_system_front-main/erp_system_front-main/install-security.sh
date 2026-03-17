#!/bin/bash
# 🛡️ سكريبت حماية شاملة ضد التعدين والاختراقات

echo "═══════════════════════════════════════════════════"
echo "🛡️  إعداد حماية شاملة ضد التعدين والاختراقات"
echo "═══════════════════════════════════════════════════"
echo ""

# ألوان للعرض
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ========================
# 1. تحديث النظام
# ========================
echo -e "${GREEN}[1/10]${NC} تحديث النظام..."
sudo apt update && sudo apt upgrade -y

# ========================
# 2. تثبيت ClamAV (Antivirus)
# ========================
echo ""
echo -e "${GREEN}[2/10]${NC} تثبيت ClamAV Antivirus..."
sudo apt install clamav clamav-daemon -y

echo "   📥 تحديث قاعدة بيانات الفيروسات..."
sudo systemctl stop clamav-freshclam
sudo freshclam
sudo systemctl start clamav-freshclam
sudo systemctl enable clamav-freshclam

# ========================
# 3. تثبيت rkhunter (فحص Rootkit)
# ========================
echo ""
echo -e "${GREEN}[3/10]${NC} تثبيت rkhunter..."
sudo apt install rkhunter -y
sudo rkhunter --update
sudo rkhunter --propupd

# ========================
# 4. تثبيت chkrootkit
# ========================
echo ""
echo -e "${GREEN}[4/10]${NC} تثبيت chkrootkit..."
sudo apt install chkrootkit -y

# ========================
# 5. تثبيت Fail2Ban
# ========================
echo ""
echo -e "${GREEN}[5/10]${NC} تثبيت Fail2Ban..."
sudo apt install fail2ban -y

# إنشاء ملف تكوين محلي
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# تكوين Fail2Ban
cat << 'EOF' | sudo tee /etc/fail2ban/jail.local > /dev/null
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
destemail = root@localhost
sendername = Fail2Ban

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
backend = %(sshd_backend)s
maxretry = 3
bantime = 3600
EOF

sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# ========================
# 6. تثبيت AIDE (مراقبة تغييرات الملفات)
# ========================
echo ""
echo -e "${GREEN}[6/10]${NC} تثبيت AIDE..."
sudo apt install aide -y
sudo aideinit
sudo cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db

# ========================
# 7. إنشاء سكريبت فحص يومي
# ========================
echo ""
echo -e "${GREEN}[7/10]${NC} إنشاء سكريبت فحص يومي..."

cat << 'SCANEOF' | sudo tee /usr/local/bin/daily-security-scan.sh > /dev/null
#!/bin/bash
# سكريبت فحص أمني يومي

LOG_FILE="/var/log/security-scan.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "=======================================" >> $LOG_FILE
echo "Security Scan - $DATE" >> $LOG_FILE
echo "=======================================" >> $LOG_FILE

# 1. فحص عمليات التعدين
echo ">>> Checking for mining processes..." >> $LOG_FILE
ps aux | grep -iE "xmrig|minerd|cpuminer|ethminer|xmr-stak|ccminer|bfgminer|cgminer|kinsing" | grep -v grep >> $LOG_FILE

# 2. فحص استهلاك CPU العالي
echo ">>> Top CPU consuming processes..." >> $LOG_FILE
ps aux --sort=-%cpu | head -10 >> $LOG_FILE

# 3. فحص الاتصالات المشبوهة
echo ">>> Checking suspicious network connections..." >> $LOG_FILE
netstat -antp | grep -E ":3333|:4444|:5555|:7777|:8888|:14444" >> $LOG_FILE

# 4. فحص ملفات cron
echo ">>> Checking cron jobs..." >> $LOG_FILE
crontab -l >> $LOG_FILE 2>&1

# 5. فحص ملفات تم تعديلها حديثاً
echo ">>> Recently modified files in /tmp..." >> $LOG_FILE
find /tmp -type f -mtime -1 -ls >> $LOG_FILE 2>&1

# 6. فحص أسماء ملفات مشبوهة
echo ">>> Searching for suspicious files..." >> $LOG_FILE
find / -name "*xmrig*" -o -name "*capool*" -o -name "*miner*" 2>/dev/null >> $LOG_FILE

# 7. Quick ClamAV scan
echo ">>> Running ClamAV quick scan..." >> $LOG_FILE
clamscan -r --bell -i /tmp /var/tmp >> $LOG_FILE 2>&1

echo "" >> $LOG_FILE
SCANEOF

sudo chmod +x /usr/local/bin/daily-security-scan.sh

# ========================
# 8. إعداد Cron للفحص التلقائي
# ========================
echo ""
echo -e "${GREEN}[8/10]${NC} إعداد فحص تلقائي يومي..."

# إضافة cron job للفحص اليومي
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/daily-security-scan.sh") | crontab -

# إضافة cron job لـ rkhunter أسبوعياً
(crontab -l 2>/dev/null; echo "0 3 * * 0 /usr/bin/rkhunter --check --skip-keypress --report-warnings-only") | crontab -

# إضافة cron job لـ ClamAV أسبوعياً
(crontab -l 2>/dev/null; echo "0 4 * * 0 /usr/bin/clamscan -r --remove /home /root >> /var/log/clamav-scan.log 2>&1") | crontab -

# ========================
# 9. تأمين SSH إضافي
# ========================
echo ""
echo -e "${GREEN}[9/10]${NC} تأمين SSH..."

# تعطيل root login بـ password (SSH Keys فقط موصى به)
sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config

# تعطيل Empty Passwords
sudo sed -i 's/#PermitEmptyPasswords no/PermitEmptyPasswords no/' /etc/ssh/sshd_config
sudo sed -i 's/PermitEmptyPasswords yes/PermitEmptyPasswords no/' /etc/ssh/sshd_config

# إعادة تشغيل SSH
sudo systemctl restart sshd

# ========================
# 10. إنشاء سكريبت مراقبة فورية
# ========================
echo ""
echo -e "${GREEN}[10/10]${NC} إنشاء سكريبت مراقبة فورية..."

cat << 'MONEOF' | sudo tee /usr/local/bin/monitor-mining.sh > /dev/null
#!/bin/bash
# مراقبة فورية للتعدين

echo "🔍 فحص عمليات التعدين..."
echo ""

# البحث عن عمليات تعدين
MINING_PROCESSES=$(ps aux | grep -iE "xmrig|minerd|cpuminer|ethminer|xmr-stak|ccminer|bfgminer|cgminer|kinsing|\.capool" | grep -v grep)

if [ -z "$MINING_PROCESSES" ]; then
    echo "✅ لا توجد عمليات تعدين مكتشفة"
else
    echo "🚨 تحذير! تم اكتشاف عمليات تعدين:"
    echo "$MINING_PROCESSES"
    echo ""
    echo "🔪 قتل العمليات..."
    pkill -9 -f "xmrig|minerd|cpuminer|ethminer|xmr-stak|ccminer|kinsing|capool"
    echo "✅ تم إيقاف العمليات"
fi

echo ""
echo "🔍 فحص استهلاك CPU..."
echo "أعلى 5 عمليات:"
ps aux --sort=-%cpu | head -6

echo ""
echo "🔍 فحص الاتصالات المشبوهة..."
SUSPICIOUS_CONN=$(netstat -antp 2>/dev/null | grep -E ":3333|:4444|:5555|:7777|:8888|:14444")
if [ -z "$SUSPICIOUS_CONN" ]; then
    echo "✅ لا توجد اتصالات مشبوهة"
else
    echo "⚠️  اتصالات مشبوهة مكتشفة:"
    echo "$SUSPICIOUS_CONN"
fi

echo ""
echo "✅ اكتمل الفحص!"
MONEOF

sudo chmod +x /usr/local/bin/monitor-mining.sh

# ========================
# فحص فوري بعد التثبيت
# ========================
echo ""
echo "═══════════════════════════════════════════════════"
echo -e "${YELLOW}🔍 تشغيل فحص فوري...${NC}"
echo "═══════════════════════════════════════════════════"
echo ""

# فحص عمليات التعدين
echo "1. فحص عمليات التعدين..."
ps aux | grep -iE "xmrig|miner|kinsing|capool" | grep -v grep

# فحص ملفات مشبوهة
echo ""
echo "2. فحص ملفات مشبوهة..."
find / -name "*xmrig*" -o -name "*capool*" 2>/dev/null | head -10

# فحص cron
echo ""
echo "3. فحص cron jobs..."
crontab -l

# فحص سريع مع rkhunter
echo ""
echo "4. فحص سريع مع rkhunter..."
sudo rkhunter --check --skip-keypress --report-warnings-only

# ========================
# النتيجة النهائية
# ========================
echo ""
echo "═══════════════════════════════════════════════════"
echo -e "${GREEN}✅ تم إعداد الحماية بنجاح!${NC}"
echo "═══════════════════════════════════════════════════"
echo ""
echo "📋 الأدوات المثبتة:"
echo "   ✅ ClamAV - Antivirus"
echo "   ✅ rkhunter - فحص Rootkit"
echo "   ✅ chkrootkit - فحص Rootkit"
echo "   ✅ Fail2Ban - حماية من Brute Force"
echo "   ✅ AIDE - مراقبة تغييرات الملفات"
echo ""
echo "📊 الفحوصات التلقائية:"
echo "   🔄 فحص يومي: 2:00 AM"
echo "   🔄 rkhunter أسبوعي: الأحد 3:00 AM"
echo "   🔄 ClamAV أسبوعي: الأحد 4:00 AM"
echo ""
echo "🛠️  الأوامر المتاحة:"
echo "   • فحص فوري: sudo /usr/local/bin/monitor-mining.sh"
echo "   • فحص يومي: sudo /usr/local/bin/daily-security-scan.sh"
echo "   • فحص ClamAV: sudo clamscan -r /home"
echo "   • فحص rkhunter: sudo rkhunter --check"
echo "   • حالة Fail2Ban: sudo fail2ban-client status"
echo ""
echo "📁 ملفات اللوج:"
echo "   • /var/log/security-scan.log"
echo "   • /var/log/clamav-scan.log"
echo "   • /var/log/fail2ban.log"
echo ""
echo -e "${YELLOW}⚠️  توصيات إضافية:${NC}"
echo "   1. راجع cron jobs بانتظام: crontab -l"
echo "   2. راقب /var/log/security-scan.log"
echo "   3. فحص استهلاك CPU: top أو htop"
echo "   4. قم بتشغيل: sudo /usr/local/bin/monitor-mining.sh"
echo ""
