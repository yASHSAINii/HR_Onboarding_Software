create database hr_onb;

create table admin_user(
id serial unique,
first_name varchar(50) not null,
last_name varchar(50) not null,
mail_id varchar(50) unique not null,
password text not null,
role varchar(50) not null,
permissions varchar(50) not null,
phone_num varchar(15)
);

insert into admin_user(first_name, last_name, mail_id, password, role, permissions, phone_num)
values('john', 'doe', 'johndoe@example.com', 'johndoe123', 'hr_manager', 'Full', '+91_1234567890')
;

select * from admin_user;
