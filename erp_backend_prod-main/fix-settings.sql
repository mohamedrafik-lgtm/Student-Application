-- تحديث حقول مواقع عناصر بطاقة الهوية بقيم افتراضية
UPDATE SystemSettings 
SET 
  idCardLogoPosition = '{"x": 20, "y": 20}',
  idCardNamePosition = '{"x": 20, "y": 80}',
  idCardPhotoPosition = '{"x": 220, "y": 20}',
  idCardNationalIdPosition = '{"x": 20, "y": 120}',
  idCardProgramPosition = '{"x": 20, "y": 140}',
  idCardCenterNamePosition = '{"x": 20, "y": 40}',
  idCardAdditionalTextPosition = '{"x": 20, "y": 160}'; 