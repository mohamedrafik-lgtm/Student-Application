                        <DetailItem label="البرنامج" value={trainee.program?.nameAr || 'غير محدد'} />
                        <DetailItem label="نوع الالتحاق" value={getEnrollmentTypeLabel(trainee.enrollmentType)} />
                        <DetailItem label="نوع البرنامج" value={getProgramTypeLabel(trainee.programType)} />
                        <DetailItem label="العام الدراسي" value={trainee.academicYear || 'غير محدد'} /> 