const { asyncHandler } = require("../middleware/errorHandler");
const { Plan } = require("../models");
const ApiResponse = require("../utils/apiResponse");
const { transporter } = require("../utils/helpers");
exports.getPlans = asyncHandler(async (req, res) => {
    const getplans = await Plan.findAll({
            where: { status: true }
        })

   const plans =   getplans.map(p => ({
                id: p.id,
                name: p.name,
                badge: p.tagline,
                description: p.description,
                price: p.price,
                maxPrice: p.maxPrice,
                duration: `${p.duration} ${p.duration > 1 ? p.durationType + 's' : p.durationType}`,
                highlight: p.highlight,
                features: p.features,
                limits: p.limits,
                config: p.config
            })) 

  ApiResponse.success(res, plans);
});

exports.sendEmail = asyncHandler(async (req, res) => {
    
    const info = await transporter.sendMail({
    from: '"My App" <no-reply@elitetrustvault.com>',
    to: 'ejirojames2000@gmail.com',
    subject: 'Welcome 🎉',
    text: 'Welcome to My App',
    html: '<h2>Welcome to My App</h2>',
  });
  ApiResponse.success(res, info.messageId , 'message sent' );
})