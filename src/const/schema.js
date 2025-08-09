import Joi from 'joi'
import libphonenumber from 'google-libphonenumber'

const checkPhone = (phone) => {
  let phoneStr = `${phone}`.trim()
  // 支援 +852/+853，允許有無空白
  phoneStr = phoneStr.replace(/^\+\d+\s?/, '')
  if (/^\d+$/.test(phoneStr)) {
    return true
  }
  const phoneUtil = libphonenumber.PhoneNumberUtil.getInstance()
  const regions = ['HK', 'MO', 'CN']
  for (const region of regions) {
    try {
      const phoneNumber = phoneUtil.parseAndKeepRawInput(`${phone}`, region)
      if (phoneUtil.isValidNumber(phoneNumber)) {
        return true
      }
    } catch {}
  }
  return false
}

const schema = Joi.object({
  basic: Joi.object({
    organization: Joi.string().required(),
    cellPhone: Joi.array().items(
      Joi.string().custom((value, helper) => {
        if (!checkPhone(value)) {
          return helper.message("phone is incorrect")
        }
        return value
      }),
      Joi.number()
    ).required(),
    url: Joi.string().uri().optional(),
    workEmail: Joi.array().items(Joi.string().email()).optional()
  }).required()
})

export default schema