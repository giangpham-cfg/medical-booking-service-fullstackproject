import db from '../models/index';
require('dotenv').config();
import emailService from './emailService';
import { v4 as uuidv4 } from 'uuid';
import { reject } from 'lodash';

let buildUrlEmail = (doctorId, token) => {

    let result = `${process.env.URL_REACT}/verify-booking?token=${token}&doctorId=${doctorId}`

    return result;
}

let postBookAppointment = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.email || !data.doctorId || !data.timeType || !data.date
                || !data.fullName
            ) {
                resolve({
                    errCode: 1,
                    errMessage: 'Missing parameter'
                })
            } else {

                let token = uuidv4(); // ⇨ '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'

                await emailService.sendSimpleEmail({
                    receiverEmail: data.email,
                    patientName: data.fullName,
                    time: data.timeString,
                    doctorName: data.doctorName,
                    language: data.language,
                    redirectLink: buildUrlEmail(data.doctorId, token)
                })

                //upsert patient
                let user = await db.User.findOrCreate({
                    where: { email: data.email },
                    defaults: {
                        email: data.email,
                        roleId: "R3",
                    }
                });
                // console.log('check user: ', user[0])
                //create a booking record
                // if (user && user[0]) {
                //     await db.Booking.findOrCreate({
                //         where: {
                //             patientId: user[0].id,
                //         },
                //         defaults: {
                //             statusId: 'S1',
                //             doctorId: data.doctorId,
                //             patientId: user[0].id,
                //             date: data.date,
                //             timeType: data.timeType,
                //             token: token
                //         }
                //     })
                // }

                if (user && user[0]) {
                    let findUser = await db.Booking.findOne({
                        where: {
                            patientId: user[0].id
                        },
                        // raw: false
                    })
                    let findDate = await db.Booking.findOne({
                        where: {
                            date: data.date
                        },
                        // raw: false
                    })
                    if (!findUser || !findDate) {
                        await db.Booking.create({
                            statusId: 'S1',
                            doctorId: data.doctorId,
                            patientId: user[0].id,
                            date: data.date,
                            timeType: data.timeType,
                            token: token
                        });

                        resolve({
                            errCode: 0,
                            errMessage: 'Booking appointment succeed!'
                        })
                        // } if (findUser && !findDate) {
                        //     await db.Booking.create({
                        //         statusId: 'S1',
                        //         doctorId: data.doctorId,
                        //         patientId: user[0].id,
                        //         date: data.date,
                        //         timeType: data.timeType,
                        //         token: token
                        //     });

                        //     resolve({
                        //         errCode: 0,
                        //         errMessage: 'Booking appointment succeed!'
                        //     })
                        // } if (!findUser && !findDate) {
                        //     await db.Booking.create({
                        //         statusId: 'S1',
                        //         doctorId: data.doctorId,
                        //         patientId: user[0].id,
                        //         date: data.date,
                        //         timeType: data.timeType,
                        //         token: token
                        //     });

                        //     resolve({
                        //         errCode: 0,
                        //         errMessage: 'Booking appointment succeed!'
                        //     })
                    } else {
                        resolve({
                            errCode: 2,
                            errMessage: 'Appointment has been booked on this day or does not exist!'
                        })
                    }
                }

                // resolve({
                //     errCode: 0,
                //     errMessage: 'Save info patient succed!'
                // })
            }

        } catch (e) {
            reject(e);
        }
    })
}

let postVerifyBookAppointment = (data) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!data.token || !data.doctorId) {
                resolve({
                    errCode: 1,
                    errMessage: 'Missing parameter'
                })
            } else {
                let appointment = await db.Booking.findOne({
                    where: {
                        doctorId: data.doctorId,
                        token: data.token,
                        statusId: 'S1'
                    },
                    raw: false //trả ra sequelize object (true thì sẽ trả ra object của javascript) thì mới dùng đc hàm "save". Nếu muốn biết true false khác nhau như nào thì "console.log(appointment)" để check"
                })

                if (appointment) {
                    appointment.statusId = 'S2';
                    await appointment.save();
                    resolve({
                        errCode: 0,
                        errMessage: 'Update the appointment succeed!'
                    })
                } else {
                    resolve({
                        errCode: 2,
                        errMessage: 'Appointment has been activated or does not exist!'
                    })
                }
            }
        } catch (e) {
            reject(e);
        }
    })
}

module.exports = {
    postBookAppointment: postBookAppointment,
    postVerifyBookAppointment: postVerifyBookAppointment
}