package io.masse.parityleaguestats;

enum Gender {
    Unknown(R.color.manualEntryButtonColour),
    Female(R.color.leftGirlsColour),
    Male(R.color.leftGuysColour);

    public int colorId;

    Gender(int colorId){
        this.colorId = colorId;
    }
}
