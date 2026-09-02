export class ResponseLoginDto {
  loginname!: string;
  name!: string | null;
  password!: string | null;
  passweb!: string | null;
  accessright!: string | null;
  department!: string | null;
  departmentposition!: string | null;
  entryposition!: string | null;
  picture!: Uint8Array | null;
  startfullscreen!: string | null;
  doctorcode!: string | null;
  drug_access_level!: number | null;
  groupname!: string | null;
  visible_menu!: string | null;
  viewallmenu!: string | null;
  lab_staff!: string | null;
  hospital_department_id!: number | null;
  nhso_user!: string | null;
  nhso_password!: string | null;
  max_station!: number | null;
  show_tip!: string | null;
  password_expire_date!: Date | null;
  password_recheck_date!: number | null;
  new_password_date!: Date | null;
  check_lab_password!: string | null;
  pcu_user!: string | null;
  account_disable!: string | null;
  restrict_ward_access!: string | null;
  real_staff!: string | null;
  restrict_clinic_access!: string | null;
  no_lab_result_display!: string | null;
  no_doctor_consult_display!: string | null;
  no_announce_display!: string | null;
  announce_read_count!: number | null;
  xray_staff!: string | null;
  hos_guid!: string | null;
  lab_check_password!: string | null;
  cid!: string | null;
  hos_guid_ext!: string | null;
  auto_logout_minute!: number | null;
  iclaim_jwt!: string | null;
  moph_acc_user!: string | null;
  moph_acc_password!: string | null;
  send_moph_otp!: string | null;
}

export function toAuthResponse(opduser: ResponseLoginDto): ResponseLoginDto {
  return {
    loginname: opduser.loginname,
    name: opduser.name,
    password: opduser.password,
    passweb: opduser.passweb,
    accessright: opduser.accessright,
    department: opduser.department,
    departmentposition: opduser.departmentposition,
    entryposition: opduser.entryposition,
    picture: opduser.picture,
    startfullscreen: opduser.startfullscreen,
    doctorcode: opduser.doctorcode,
    drug_access_level: opduser.drug_access_level,
    groupname: opduser.groupname,
    visible_menu: opduser.visible_menu,
    viewallmenu: opduser.viewallmenu,
    lab_staff: opduser.lab_staff,
    hospital_department_id: opduser.hospital_department_id,
    nhso_user: opduser.nhso_user,
    nhso_password: opduser.nhso_password,
    max_station: opduser.max_station,
    show_tip: opduser.show_tip,
    password_expire_date: opduser.password_expire_date,
    password_recheck_date: opduser.password_recheck_date,
    new_password_date: opduser.new_password_date,
    check_lab_password: opduser.check_lab_password,
    pcu_user: opduser.pcu_user,
    account_disable: opduser.account_disable,
    restrict_ward_access: opduser.restrict_ward_access,
    real_staff: opduser.real_staff,
    restrict_clinic_access: opduser.restrict_clinic_access,
    no_lab_result_display: opduser.no_lab_result_display,
    no_doctor_consult_display: opduser.no_doctor_consult_display,
    no_announce_display: opduser.no_announce_display,
    announce_read_count: opduser.announce_read_count,
    xray_staff: opduser.xray_staff,
    hos_guid: opduser.hos_guid,
    lab_check_password: opduser.lab_check_password,
    cid: opduser.cid,
    hos_guid_ext: opduser.hos_guid_ext,
    auto_logout_minute: opduser.auto_logout_minute,
    iclaim_jwt: opduser.iclaim_jwt,
    moph_acc_user: opduser.moph_acc_user,
    moph_acc_password: opduser.moph_acc_password,
    send_moph_otp: opduser.send_moph_otp,
  };
}
