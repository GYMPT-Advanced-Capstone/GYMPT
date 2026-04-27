SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `user` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) NOT NULL,
  `pw` VARCHAR(255) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `nickname` VARCHAR(100) NOT NULL,
  `birth_date` DATE NULL,
  `weekly_target` INT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_email` (`email`),
  UNIQUE KEY `uq_user_nickname` (`nickname`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `exercises` (
  `id` BIGINT NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `description` VARCHAR(250) NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* "email": "user@example.com",
      "pw": "password123" */
INSERT INTO `user` (`email`, `pw`, `name`, `nickname`, `birth_date`, `weekly_target`)
SELECT
  'user@example.com',
  '$2b$12$bXJkuCYQ4.INeHdIlRcjYOuqzCufdyl7avSN7gAAWtBW3B8SV2CzG',
  '홍길동',
  '길동이',
  '1999-01-01',
  3
WHERE NOT EXISTS (
  SELECT 1 FROM `user` WHERE `email` = 'user@example.com'
);

INSERT INTO `exercises` (`id`, `name`, `description`)
SELECT 1, 'Push Up', '가슴과 팔 근육을 사용하는 대표적인 맨몸 운동'
WHERE NOT EXISTS (SELECT 1 FROM `exercises` WHERE `id` = 1);

INSERT INTO `exercises` (`id`, `name`, `description`)
SELECT 2, 'Squat', '하체와 코어를 강화하는 기본 스쿼트 운동'
WHERE NOT EXISTS (SELECT 1 FROM `exercises` WHERE `id` = 2);

INSERT INTO `exercises` (`id`, `name`, `description`)
SELECT 3, 'Lunge', '균형감과 하체 근력을 함께 기르는 런지 운동'
WHERE NOT EXISTS (SELECT 1 FROM `exercises` WHERE `id` = 3);

INSERT INTO `exercises` (`id`, `name`, `description`)
SELECT 4, 'Plank', '복부와 코어 안정성을 높이는 플랭크 운동'
WHERE NOT EXISTS (SELECT 1 FROM `exercises` WHERE `id` = 4);
