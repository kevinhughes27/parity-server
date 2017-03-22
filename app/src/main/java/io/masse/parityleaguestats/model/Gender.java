package io.masse.parityleaguestats.model;

import io.masse.parityleaguestats.R;

public enum Gender {
    Unknown(R.color.manualEntryButtonColour),
    Female(R.color.leftGirlsColour),
    Male(R.color.leftGuysColour);

    public int colorId;

    Gender(int colorId){
        this.colorId = colorId;
    }
}
