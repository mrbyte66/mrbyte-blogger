package com.satir.delivery.application;

public interface MailGateway {
    boolean configured();
    void send(String recipient,String subject,String text,String deliveryId);
}
